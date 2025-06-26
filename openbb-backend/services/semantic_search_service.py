import os
import json
import logging
import time
from typing import List, Dict, Optional, Tuple
from datetime import datetime
import sqlite3
from contextlib import contextmanager
import hashlib
import redis

# Optional imports
try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False
    logging.warning("OpenAI not installed. Semantic search will use fallback.")

try:
    from pinecone import Pinecone, ServerlessSpec
    HAS_PINECONE = True
except ImportError:
    HAS_PINECONE = False
    logging.warning("Pinecone not installed. Vector search will be disabled.")

logger = logging.getLogger(__name__)

class SemanticSearchService:
    def __init__(self):
        # Initialize OpenAI
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key or not HAS_OPENAI:
            logger.warning("OpenAI not available. Semantic search will be limited.")
        elif HAS_OPENAI:
            openai.api_key = self.openai_api_key
            
        # Initialize Pinecone
        self.pinecone_api_key = os.getenv('PINECONE_API_KEY')
        self.pinecone_environment = os.getenv('PINECONE_ENVIRONMENT', 'us-east-1-aws')
        self.pinecone_index_name = os.getenv('PINECONE_INDEX_NAME', 'private-companies')
        
        self.index = None  # Initialize to None
        if self.pinecone_api_key and HAS_PINECONE:
            self.pc = Pinecone(api_key=self.pinecone_api_key)
            self._init_pinecone_index()
        else:
            logger.warning("Pinecone not available. Vector search will be disabled.")
            self.pc = None
            
        # Database path
        self.db_path = os.getenv('PRIVATE_COMPANY_DB_PATH', '/data/company_database.db')
        
        # Redis for caching
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'redis'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            decode_responses=True,
            db=2  # Different DB for semantic search
        )
        
        # Cache settings
        self.cache_ttl = 3600  # 1 hour
        
    def _init_pinecone_index(self):
        """Initialize Pinecone index if it doesn't exist"""
        try:
            # Check if index exists
            indexes = self.pc.list_indexes()
            if self.pinecone_index_name not in [idx.name for idx in indexes]:
                # Create index
                self.pc.create_index(
                    name=self.pinecone_index_name,
                    dimension=1536,  # OpenAI embedding dimension
                    metric='cosine',
                    spec=ServerlessSpec(
                        cloud='aws',
                        region='us-east-1'
                    )
                )
                logger.info(f"Created Pinecone index: {self.pinecone_index_name}")
            
            self.index = self.pc.Index(self.pinecone_index_name)
        except Exception as e:
            logger.error(f"Error initializing Pinecone: {str(e)}")
            self.index = None
    
    @contextmanager
    def get_db_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def parse_natural_language_query(self, query: str) -> Dict:
        """Parse natural language query into structured filters using GPT"""
        if not self.openai_api_key or not HAS_OPENAI:
            return self._fallback_parse(query)
            
        try:
            prompt = f"""
            Parse the following natural language query about private companies into structured filters.
            Extract the following information if present:
            - industry: specific industry or business type
            - location: state, city, or region (convert to state abbreviation if possible)
            - employee_range: minimum and maximum employee count
            - founded_year_range: minimum and maximum founded year
            - status: company status (active, acquired, etc.)
            - has_ppp: whether to include/exclude PPP loan recipients
            - keywords: other important keywords not covered above
            
            Query: "{query}"
            
            Return a JSON object with the extracted information. Only include fields that are explicitly mentioned or strongly implied.
            For location, use standard US state abbreviations (e.g., CA for California, NY for New York).
            
            Example output:
            {{
                "industry": "automobile",
                "location": "CA",
                "employee_range": {{"min": 100, "max": 1000}},
                "keywords": ["electric", "sustainable"]
            }}
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a query parser that extracts structured information from natural language queries about companies."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                max_tokens=500
            )
            
            parsed = json.loads(response.choices[0].message.content)
            logger.info(f"Parsed query: {query} -> {parsed}")
            return parsed
            
        except Exception as e:
            logger.error(f"Error parsing query with GPT: {str(e)}")
            return self._fallback_parse(query)
    
    def _fallback_parse(self, query: str) -> Dict:
        """Simple fallback parser for when OpenAI is not available"""
        query_lower = query.lower()
        parsed = {}
        
        # Simple keyword matching for industries - expanded to match database values
        industries = {
            'automobile': ['auto', 'car', 'vehicle', 'automotive', 'motor'],
            'technology': ['tech', 'software', 'computer', 'it', 'scientific', 'technical', 'information'],
            'healthcare': ['health', 'medical', 'pharma', 'hospital', 'care', 'social assistance'],
            'finance': ['bank', 'financial', 'investment', 'insurance', 'finance'],
            'retail': ['store', 'shop', 'retail', 'commerce', 'trade'],
            'food': ['restaurant', 'food', 'dining', 'cafe', 'accommodation', 'beverage'],
            'construction': ['construction', 'building', 'contractor'],
            'transportation': ['transport', 'trucking', 'logistics', 'warehousing'],
            'manufacturing': ['manufacturing', 'production', 'factory'],
            'real estate': ['real estate', 'property', 'realty'],
        }
        
        for industry, keywords in industries.items():
            if any(kw in query_lower for kw in keywords):
                parsed['industry'] = industry
                break
        
        # State matching
        states = {
            'california': 'CA', 'texas': 'TX', 'new york': 'NY', 'florida': 'FL',
            'illinois': 'IL', 'pennsylvania': 'PA', 'ohio': 'OH', 'georgia': 'GA',
            'michigan': 'MI', 'north carolina': 'NC', 'new jersey': 'NJ',
            'virginia': 'VA', 'washington': 'WA', 'massachusetts': 'MA',
            'arizona': 'AZ', 'tennessee': 'TN', 'indiana': 'IN', 'missouri': 'MO',
            'maryland': 'MD', 'wisconsin': 'WI', 'minnesota': 'MN', 'colorado': 'CO',
            'alabama': 'AL', 'south carolina': 'SC', 'louisiana': 'LA', 'kentucky': 'KY',
            'oregon': 'OR', 'oklahoma': 'OK', 'connecticut': 'CT', 'utah': 'UT',
            'iowa': 'IA', 'nevada': 'NV', 'arkansas': 'AR', 'mississippi': 'MS',
            'kansas': 'KS', 'new mexico': 'NM', 'nebraska': 'NE', 'idaho': 'ID',
            'west virginia': 'WV', 'hawaii': 'HI', 'new hampshire': 'NH', 'maine': 'ME',
            'montana': 'MT', 'rhode island': 'RI', 'delaware': 'DE', 'south dakota': 'SD',
            'north dakota': 'ND', 'alaska': 'AK', 'vermont': 'VT', 'wyoming': 'WY'
        }
        
        for state_name, state_code in states.items():
            if state_name in query_lower or f' {state_code.lower()} ' in f' {query_lower} ':
                parsed['location'] = state_code
                break
        
        # Extract remaining keywords
        keywords = []
        for word in query.split():
            word_lower = word.lower()
            if len(word_lower) > 3 and word_lower not in ['companies', 'company', 'business', 'businesses']:
                keywords.append(word_lower)
        
        if keywords:
            parsed['keywords'] = keywords[:5]  # Limit to 5 keywords
            
        return parsed
    
    def generate_sql_filters(self, parsed_query: Dict) -> Tuple[List[str], List]:
        """Convert parsed query into SQL WHERE clauses"""
        where_clauses = []
        params = []
        
        # Industry filter - search for keywords associated with the industry
        if 'industry' in parsed_query:
            # Get the keywords for this industry from our mapping
            industry_keywords = {
                'automobile': ['auto', 'car', 'vehicle', 'automotive', 'motor'],
                'technology': ['tech', 'software', 'computer', 'scientific', 'technical', 'information'],
                'healthcare': ['health', 'medical', 'pharma', 'hospital', 'care', 'social'],
                'finance': ['bank', 'financial', 'investment', 'insurance', 'finance'],
                'retail': ['store', 'shop', 'retail', 'commerce', 'trade'],
                'food': ['restaurant', 'food', 'dining', 'cafe', 'accommodation', 'beverage'],
                'construction': ['construction', 'building', 'contractor'],
                'transportation': ['transport', 'truck', 'logistics', 'warehouse'],
                'manufacturing': ['manufacturing', 'production', 'factory'],
                'real estate': ['real estate', 'property', 'realty'],
            }
            
            keywords = industry_keywords.get(parsed_query['industry'], [parsed_query['industry']])
            industry_clauses = []
            
            for keyword in keywords:
                industry_clauses.append("(LOWER(industry_primary) LIKE ? OR LOWER(description) LIKE ?)")
                keyword_param = f"%{keyword}%"
                params.extend([keyword_param, keyword_param])
            
            if industry_clauses:
                where_clauses.append(f"({' OR '.join(industry_clauses)})")
        
        # Location filter
        if 'location' in parsed_query:
            where_clauses.append("state = ?")
            params.append(parsed_query['location'])
        
        # Employee range
        if 'employee_range' in parsed_query:
            if 'min' in parsed_query['employee_range']:
                where_clauses.append("(employee_count >= ? OR employees >= ?)")
                params.extend([parsed_query['employee_range']['min']] * 2)
            if 'max' in parsed_query['employee_range']:
                where_clauses.append("(employee_count <= ? OR employees <= ?)")
                params.extend([parsed_query['employee_range']['max']] * 2)
        
        # Founded year range
        if 'founded_year_range' in parsed_query:
            if 'min' in parsed_query['founded_year_range']:
                where_clauses.append("founded_year >= ?")
                params.append(parsed_query['founded_year_range']['min'])
            if 'max' in parsed_query['founded_year_range']:
                where_clauses.append("founded_year <= ?")
                params.append(parsed_query['founded_year_range']['max'])
        
        # Status filter
        if 'status' in parsed_query:
            where_clauses.append("status = ?")
            params.append(parsed_query['status'])
        
        # PPP filter
        if 'has_ppp' in parsed_query:
            if parsed_query['has_ppp']:
                where_clauses.append("loan_amount > 0")
            else:
                where_clauses.append("(loan_amount IS NULL OR loan_amount = 0)")
        
        # Keywords search in multiple fields
        if 'keywords' in parsed_query:
            keyword_clauses = []
            for keyword in parsed_query['keywords']:
                keyword_clauses.append("""
                    (LOWER(company_name) LIKE ? OR 
                     LOWER(description) LIKE ? OR 
                     LOWER(industry_primary) LIKE ? OR 
                     LOWER(business_type) LIKE ?)
                """)
                keyword_param = f"%{keyword}%"
                params.extend([keyword_param] * 4)
            
            if keyword_clauses:
                where_clauses.append(f"({' OR '.join(keyword_clauses)})")
        
        return where_clauses, params
    
    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Get embeddings for texts using OpenAI"""
        if not self.openai_api_key or not HAS_OPENAI:
            return []
            
        try:
            response = openai.Embedding.create(
                model="text-embedding-ada-002",
                input=texts
            )
            return [item['embedding'] for item in response['data']]
        except Exception as e:
            logger.error(f"Error getting embeddings: {str(e)}")
            return []
    
    def semantic_search(self, query: str, limit: int = 100) -> Tuple[List[Dict], Dict]:
        """Perform semantic search on company database"""
        # Check cache first
        cache_key = f"semantic_search:{hashlib.md5(query.encode()).hexdigest()}:{limit}"
        cached = self.redis_client.get(cache_key)
        if cached:
            result = json.loads(cached)
            return result['companies'], result['parsed_query']
        
        # Parse the natural language query
        parsed_query = self.parse_natural_language_query(query)
        
        # Generate SQL filters
        where_clauses, params = self.generate_sql_filters(parsed_query)
        
        # Build SQL query
        base_query = "SELECT * FROM companies"
        if where_clauses:
            base_query += " WHERE " + " AND ".join(where_clauses)
        
        # Add relevance scoring if we have keywords
        if 'keywords' in parsed_query and parsed_query['keywords']:
            # Simple relevance scoring based on keyword matches
            relevance_score = []
            for keyword in parsed_query['keywords']:
                relevance_score.append(f"""
                    (CASE WHEN LOWER(company_name) LIKE '%{keyword}%' THEN 10 ELSE 0 END +
                     CASE WHEN LOWER(industry_primary) LIKE '%{keyword}%' THEN 5 ELSE 0 END +
                     CASE WHEN LOWER(description) LIKE '%{keyword}%' THEN 3 ELSE 0 END)
                """)
            
            base_query = f"""
                SELECT *, ({' + '.join(relevance_score)}) as relevance_score
                FROM companies
            """
            if where_clauses:
                base_query += " WHERE " + " AND ".join(where_clauses)
            base_query += " ORDER BY relevance_score DESC, company_name ASC"
        else:
            base_query += " ORDER BY company_name ASC"
        
        base_query += " LIMIT ?"
        params.append(limit)
        
        try:
            with self.get_db_connection() as conn:
                cursor = conn.execute(base_query, params)
                companies = [dict(row) for row in cursor]
                
                # If we have Pinecone and embeddings, enhance with vector search
                if self.index and self.openai_api_key and HAS_OPENAI and len(companies) < limit:
                    # Get query embedding
                    query_embedding = self.get_embeddings([query])
                    if query_embedding:
                        # Search in Pinecone
                        results = self.index.query(
                            vector=query_embedding[0],
                            top_k=limit,
                            include_metadata=True
                        )
                        
                        # Merge results
                        existing_ids = {c['company_id'] for c in companies}
                        for match in results['matches']:
                            if match['id'] not in existing_ids and len(companies) < limit:
                                # Fetch company from database
                                company = self._get_company_by_id(match['id'])
                                if company:
                                    company['similarity_score'] = match['score']
                                    companies.append(company)
                
                # Cache the result
                cache_data = {
                    'companies': companies,
                    'parsed_query': parsed_query
                }
                self.redis_client.setex(
                    cache_key,
                    self.cache_ttl,
                    json.dumps(cache_data)
                )
                
                return companies, parsed_query
                
        except Exception as e:
            logger.error(f"Error in semantic search: {str(e)}")
            return [], parsed_query
    
    def _get_company_by_id(self, company_id: str) -> Optional[Dict]:
        """Get company by ID"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.execute(
                    "SELECT * FROM companies WHERE company_id = ?",
                    (company_id,)
                )
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching company {company_id}: {str(e)}")
            return None
    
    def index_companies(self, batch_size: int = 100):
        """Index all companies in Pinecone for vector search"""
        if not self.index or not self.openai_api_key or not HAS_OPENAI:
            logger.warning("Cannot index companies: Pinecone or OpenAI not configured")
            return
        
        try:
            with self.get_db_connection() as conn:
                cursor = conn.execute("SELECT COUNT(*) FROM companies")
                total_count = cursor.fetchone()[0]
                
                logger.info(f"Starting to index {total_count} companies...")
                
                offset = 0
                indexed_count = 0
                
                while offset < total_count:
                    # Fetch batch
                    cursor = conn.execute(
                        "SELECT * FROM companies LIMIT ? OFFSET ?",
                        (batch_size, offset)
                    )
                    companies = [dict(row) for row in cursor]
                    
                    if not companies:
                        break
                    
                    # Prepare texts for embedding
                    texts = []
                    for company in companies:
                        text_parts = [
                            company.get('company_name', ''),
                            company.get('description', ''),
                            company.get('industry_primary', ''),
                            company.get('city', ''),
                            company.get('state', ''),
                        ]
                        text = ' '.join(filter(None, text_parts))
                        texts.append(text[:8000])  # Limit text length
                    
                    # Get embeddings
                    embeddings = self.get_embeddings(texts)
                    
                    if embeddings:
                        # Prepare vectors for Pinecone
                        vectors = []
                        for i, company in enumerate(companies):
                            vectors.append({
                                'id': company['company_id'],
                                'values': embeddings[i],
                                'metadata': {
                                    'company_name': company.get('company_name', ''),
                                    'industry': company.get('industry_primary', ''),
                                    'state': company.get('state', ''),
                                    'city': company.get('city', ''),
                                    'founded_year': company.get('founded_year', 0),
                                    'has_ppp': bool(company.get('loan_amount', 0) > 0)
                                }
                            })
                        
                        # Upsert to Pinecone
                        self.index.upsert(vectors=vectors)
                        indexed_count += len(vectors)
                        logger.info(f"Indexed {indexed_count}/{total_count} companies")
                    
                    offset += batch_size
                    time.sleep(0.1)  # Rate limiting
                
                logger.info(f"Completed indexing {indexed_count} companies")
                
        except Exception as e:
            logger.error(f"Error indexing companies: {str(e)}")