import sqlite3
import os
from typing import List, Dict, Optional, Tuple
from contextlib import contextmanager
import logging
import redis
import json
import hashlib
import time
from functools import wraps

logger = logging.getLogger(__name__)

class CachedPrivateCompanyService:
    def __init__(self):
        # Database paths
        self.main_db_path = os.getenv('PRIVATE_COMPANY_DB_PATH', '/data/company_database.db')
        self.incremental_db_path = os.getenv('PRIVATE_COMPANY_INCREMENTAL_DB_PATH', '/data/incremental_companies.db')
        
        # Initialize Redis connection
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'redis'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            decode_responses=True,
            db=1  # Use a different DB for private companies
        )
        
        # Cache configuration
        self.cache_ttl = 3600  # 1 hour
        self.short_cache_ttl = 300  # 5 minutes for searches
        
        # Verify databases exist
        if not os.path.exists(self.main_db_path):
            logger.warning(f"Main database not found at {self.main_db_path}")
        else:
            # Initialize database optimizations
            self._initialize_database()
            # Pre-cache first 100 companies
            self._precache_companies()
        
        if not os.path.exists(self.incremental_db_path):
            logger.warning(f"Incremental database not found at {self.incremental_db_path}")
    
    def _initialize_database(self):
        """Create indexes for better performance"""
        try:
            with self.get_db_connection(self.main_db_path) as conn:
                # Create indexes for commonly searched columns
                indexes = [
                    "CREATE INDEX IF NOT EXISTS idx_company_name ON companies(company_name)",
                    "CREATE INDEX IF NOT EXISTS idx_industry_primary ON companies(industry_primary)",
                    "CREATE INDEX IF NOT EXISTS idx_state ON companies(state)",
                    "CREATE INDEX IF NOT EXISTS idx_status ON companies(status)",
                    "CREATE INDEX IF NOT EXISTS idx_founded_year ON companies(founded_year)",
                    "CREATE INDEX IF NOT EXISTS idx_source_type ON companies(source_type)",
                    "CREATE INDEX IF NOT EXISTS idx_city ON companies(city)",
                    "CREATE INDEX IF NOT EXISTS idx_website_domain ON companies(website_domain)",
                    # Composite index for common filter combinations
                    "CREATE INDEX IF NOT EXISTS idx_state_industry ON companies(state, industry_primary)",
                ]
                
                for index_sql in indexes:
                    conn.execute(index_sql)
                    logger.info(f"Created index: {index_sql.split('idx_')[1].split(' ')[0]}")
                
                conn.commit()
                
                # Enable query optimizer
                conn.execute("PRAGMA optimize")
                
        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
    
    def _precache_companies(self):
        """Pre-cache first 100 companies for quick loading"""
        try:
            logger.info("Pre-caching first 100 companies...")
            companies, total = self.get_companies(page=1, limit=100, use_cache=False)
            logger.info(f"Pre-cached {len(companies)} companies")
        except Exception as e:
            logger.error(f"Error pre-caching companies: {str(e)}")
    
    @contextmanager
    def get_db_connection(self, db_path: str):
        """Context manager for database connections with optimizations"""
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        
        # Enable optimizations
        conn.execute("PRAGMA cache_size = -64000")  # 64MB cache
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA journal_mode = WAL")  # Write-Ahead Logging
        conn.execute("PRAGMA synchronous = NORMAL")
        
        try:
            yield conn
        finally:
            conn.close()
    
    def _get_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters"""
        # Sort kwargs for consistent key generation
        sorted_kwargs = sorted(kwargs.items())
        key_string = f"{prefix}:{str(sorted_kwargs)}"
        # Use hash for shorter keys
        return f"pvtco:{prefix}:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    def _cache_result(self, key: str, data: any, ttl: int = None):
        """Cache result in Redis"""
        try:
            ttl = ttl or self.cache_ttl
            self.redis_client.setex(key, ttl, json.dumps(data))
        except Exception as e:
            logger.error(f"Error caching result: {str(e)}")
    
    def _get_cached_result(self, key: str) -> Optional[any]:
        """Get cached result from Redis"""
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.error(f"Error getting cached result: {str(e)}")
        return None
    
    def cache_decorator(ttl: int = None):
        """Decorator for caching method results"""
        def decorator(func):
            @wraps(func)
            def wrapper(self, *args, **kwargs):
                # Check if caching is explicitly disabled
                use_cache = kwargs.pop('use_cache', True)
                if not use_cache:
                    return func(self, *args, **kwargs)
                
                # Generate cache key
                cache_key = self._get_cache_key(func.__name__, args=args, kwargs=kwargs)
                
                # Try to get from cache
                cached = self._get_cached_result(cache_key)
                if cached is not None:
                    logger.debug(f"Cache hit for {func.__name__}")
                    return cached
                
                # Execute function and cache result
                logger.debug(f"Cache miss for {func.__name__}")
                result = func(self, *args, **kwargs)
                self._cache_result(cache_key, result, ttl or self.cache_ttl)
                return result
            
            return wrapper
        return decorator
    
    def get_companies(
        self,
        page: int = 1,
        limit: int = 100,
        search: Optional[str] = None,
        filters: Optional[Dict] = None,
        use_cache: bool = True
    ) -> Tuple[List[Dict], int]:
        """Get paginated list of companies with optional search and filters"""
        # Generate cache key
        cache_key = self._get_cache_key(
            'companies',
            page=page,
            limit=limit,
            search=search,
            filters=str(filters) if filters else None
        )
        
        # Try cache first
        if use_cache:
            cached = self._get_cached_result(cache_key)
            if cached:
                logger.debug(f"Returning cached companies for page {page}")
                return cached['companies'], cached['total_count']
        
        offset = (page - 1) * limit
        
        # Build query
        base_query = "SELECT * FROM companies"
        count_query = "SELECT COUNT(*) FROM companies"
        where_clauses = []
        params = []
        
        # Add search clause
        if search:
            search_clause = """(
                company_name LIKE ? OR 
                website_domain LIKE ? OR 
                description LIKE ? OR
                industry_primary LIKE ? OR
                location LIKE ? OR
                city LIKE ?
            )"""
            where_clauses.append(search_clause)
            search_param = f"%{search}%"
            params.extend([search_param] * 6)
        
        # Add filters
        if filters:
            if filters.get('industry_primary'):
                where_clauses.append("industry_primary = ?")
                params.append(filters['industry_primary'])
            
            if filters.get('state'):
                where_clauses.append("state = ?")
                params.append(filters['state'])
            
            if filters.get('status'):
                where_clauses.append("status = ?")
                params.append(filters['status'])
            
            if filters.get('founded_year_min'):
                where_clauses.append("founded_year >= ?")
                params.append(filters['founded_year_min'])
            
            if filters.get('founded_year_max'):
                where_clauses.append("founded_year <= ?")
                params.append(filters['founded_year_max'])
            
            if filters.get('employee_count_min'):
                where_clauses.append("(employee_count >= ? OR employees >= ?)")
                params.extend([filters['employee_count_min']] * 2)
            
            if filters.get('employee_count_max'):
                where_clauses.append("(employee_count <= ? OR employees <= ?)")
                params.extend([filters['employee_count_max']] * 2)
            
            if filters.get('data_source'):
                where_clauses.append("source_type = ?")
                params.append(filters['data_source'])
        
        # Combine where clauses
        if where_clauses:
            where_sql = " WHERE " + " AND ".join(where_clauses)
            base_query += where_sql
            count_query += where_sql
        
        # Add ordering and pagination
        base_query += " ORDER BY company_name ASC LIMIT ? OFFSET ?"
        
        try:
            with self.get_db_connection(self.main_db_path) as conn:
                # Get total count
                count_params = params.copy()
                start_time = time.time()
                total_count = conn.execute(count_query, count_params).fetchone()[0]
                logger.debug(f"Count query took {time.time() - start_time:.3f}s")
                
                # Get paginated results
                query_params = params + [limit, offset]
                start_time = time.time()
                cursor = conn.execute(base_query, query_params)
                
                # Convert to list of dicts
                companies = []
                for row in cursor:
                    companies.append(dict(row))
                
                logger.debug(f"Data query took {time.time() - start_time:.3f}s")
                
                # Cache the result
                if use_cache:
                    cache_data = {
                        'companies': companies,
                        'total_count': total_count
                    }
                    # Use shorter TTL for searches
                    ttl = self.short_cache_ttl if search else self.cache_ttl
                    self._cache_result(cache_key, cache_data, ttl)
                
                return companies, total_count
                
        except Exception as e:
            logger.error(f"Error fetching companies: {str(e)}")
            return [], 0
    
    @cache_decorator(ttl=3600)
    def get_company_by_id(self, company_id: str) -> Optional[Dict]:
        """Get a single company by ID"""
        query = "SELECT * FROM companies WHERE company_id = ?"
        
        try:
            with self.get_db_connection(self.main_db_path) as conn:
                cursor = conn.execute(query, (company_id,))
                row = cursor.fetchone()
                
                if row:
                    return dict(row)
                return None
                
        except Exception as e:
            logger.error(f"Error fetching company {company_id}: {str(e)}")
            return None
    
    @cache_decorator(ttl=3600)
    def get_statistics(self) -> Dict:
        """Get database statistics"""
        stats = {
            'total_companies': 0,
            'by_status': {},
            'by_source': {},
            'by_industry': {},
            'by_state': {}
        }
        
        try:
            with self.get_db_connection(self.main_db_path) as conn:
                # Total count
                stats['total_companies'] = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
                
                # Count by status
                cursor = conn.execute("""
                    SELECT status, COUNT(*) as count 
                    FROM companies 
                    WHERE status IS NOT NULL 
                    GROUP BY status
                """)
                stats['by_status'] = {row[0]: row[1] for row in cursor}
                
                # Count by source
                cursor = conn.execute("""
                    SELECT source_type, COUNT(*) as count 
                    FROM companies 
                    WHERE source_type IS NOT NULL 
                    GROUP BY source_type
                """)
                stats['by_source'] = {row[0]: row[1] for row in cursor}
                
                # Top industries
                cursor = conn.execute("""
                    SELECT industry_primary, COUNT(*) as count 
                    FROM companies 
                    WHERE industry_primary IS NOT NULL 
                    GROUP BY industry_primary 
                    ORDER BY count DESC 
                    LIMIT 10
                """)
                stats['by_industry'] = {row[0]: row[1] for row in cursor}
                
                # Top states
                cursor = conn.execute("""
                    SELECT state, COUNT(*) as count 
                    FROM companies 
                    WHERE state IS NOT NULL 
                    GROUP BY state 
                    ORDER BY count DESC 
                    LIMIT 10
                """)
                stats['by_state'] = {row[0]: row[1] for row in cursor}
                
        except Exception as e:
            logger.error(f"Error fetching statistics: {str(e)}")
        
        return stats
    
    @cache_decorator(ttl=7200)  # Cache for 2 hours
    def get_filter_options(self) -> Dict:
        """Get available filter options"""
        options = {
            'industries': [],
            'states': [],
            'statuses': [],
            'sources': []
        }
        
        try:
            with self.get_db_connection(self.main_db_path) as conn:
                # Get unique industries (limited to top 100)
                cursor = conn.execute("""
                    SELECT industry_primary, COUNT(*) as count
                    FROM companies 
                    WHERE industry_primary IS NOT NULL 
                    GROUP BY industry_primary
                    ORDER BY count DESC
                    LIMIT 100
                """)
                options['industries'] = [row[0] for row in cursor]
                
                # Get unique states
                cursor = conn.execute("""
                    SELECT DISTINCT state 
                    FROM companies 
                    WHERE state IS NOT NULL 
                    ORDER BY state
                """)
                options['states'] = [row[0] for row in cursor]
                
                # Get unique statuses
                cursor = conn.execute("""
                    SELECT DISTINCT status 
                    FROM companies 
                    WHERE status IS NOT NULL 
                    ORDER BY status
                """)
                options['statuses'] = [row[0] for row in cursor]
                
                # Get unique sources
                cursor = conn.execute("""
                    SELECT DISTINCT source_type 
                    FROM companies 
                    WHERE source_type IS NOT NULL 
                    ORDER BY source_type
                """)
                options['sources'] = [row[0] for row in cursor]
                
        except Exception as e:
            logger.error(f"Error fetching filter options: {str(e)}")
        
        return options
    
    def clear_cache(self, pattern: str = None):
        """Clear cache entries"""
        try:
            if pattern:
                for key in self.redis_client.scan_iter(f"pvtco:{pattern}*"):
                    self.redis_client.delete(key)
            else:
                for key in self.redis_client.scan_iter("pvtco:*"):
                    self.redis_client.delete(key)
            logger.info(f"Cleared cache for pattern: {pattern or 'all'}")
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")