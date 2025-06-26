import os
import re
import json
import sqlite3
import logging
import boto3
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import time
from urllib.parse import urlparse
import hashlib

logger = logging.getLogger(__name__)

try:
    from .cleaning_checkpoint_service import CleaningCheckpointService
except ImportError:
    from cleaning_checkpoint_service import CleaningCheckpointService

class DataCleaningService:
    def __init__(self):
        self.db_path = os.getenv('PRIVATE_COMPANY_DB_PATH', '/data/company_database.db')
        self.searx_url = os.getenv('SEARX_URL', 'http://localhost:8888')  # SearxNG instance
        self.s3_bucket = os.getenv('S3_BUCKET_NAME', 'clean-company-data')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        
        # Initialize S3 client if AWS credentials are available
        try:
            self.s3_client = boto3.client('s3', region_name=self.aws_region)
        except Exception as e:
            logger.warning(f"Could not initialize S3 client: {e}")
            self.s3_client = None
            
        # Patterns for identifying issues
        self.person_name_pattern = re.compile(r'^[A-Z][a-z]+ [A-Z][a-z]+$')  # Simple name pattern
        self.long_description_pattern = re.compile(r'^(.+?)\s+(specializes|provides|offers|is a|focuses)', re.IGNORECASE)
        
    def analyze_non_ppp_companies(self) -> Dict:
        """Analyze Non-PPP companies to identify data quality issues"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get Non-PPP companies
            query = """
            SELECT company_id, company_name, website_url, industry_primary, description, 
                   city, state, employees, founded_year
            FROM companies
            WHERE (loan_amount IS NULL OR loan_amount = 0) 
                  AND (source_type IS NULL OR source_type != 'PPP_LOAN')
            """
            
            cursor.execute(query)
            companies = cursor.fetchall()
            
            issues = {
                'total_non_ppp': len(companies),
                'person_names_as_company': [],
                'long_descriptions_as_name': [],
                'missing_company_name': [],
                'missing_website': [],
                'missing_industry': [],
                'sample_issues': []
            }
            
            for company in companies:
                company_id, name, website, industry, description, city, state, employees, founded_year = company
                
                # Check for person names
                if name and self.person_name_pattern.match(name):
                    issues['person_names_as_company'].append({
                        'company_id': company_id,
                        'name': name,
                        'website': website,
                        'industry': industry
                    })
                    if len(issues['sample_issues']) < 10:
                        issues['sample_issues'].append({
                            'type': 'person_name',
                            'company_id': company_id,
                            'name': name,
                            'website': website
                        })
                
                # Check for long descriptions as name
                if name and len(name) > 100:
                    issues['long_descriptions_as_name'].append({
                        'company_id': company_id,
                        'name': name[:100] + '...',
                        'website': website
                    })
                    if len(issues['sample_issues']) < 10:
                        issues['sample_issues'].append({
                            'type': 'long_description',
                            'company_id': company_id,
                            'name': name[:100] + '...'
                        })
                
                # Check for missing data
                if not name or name.strip() == '':
                    issues['missing_company_name'].append(company_id)
                if not website or website.strip() == '':
                    issues['missing_website'].append(company_id)
                if not industry or industry.strip() == '':
                    issues['missing_industry'].append(company_id)
            
            conn.close()
            
            # Summary statistics
            issues['summary'] = {
                'person_names_count': len(issues['person_names_as_company']),
                'long_descriptions_count': len(issues['long_descriptions_as_name']),
                'missing_name_count': len(issues['missing_company_name']),
                'missing_website_count': len(issues['missing_website']),
                'missing_industry_count': len(issues['missing_industry'])
            }
            
            return issues
            
        except Exception as e:
            logger.error(f"Error analyzing companies: {str(e)}")
            return {'error': str(e)}
    
    def extract_company_name_from_description(self, description: str) -> Optional[str]:
        """Extract company name from long description"""
        if not description:
            return None
            
        # Try to match pattern like "Company Name specializes/provides/offers..."
        match = self.long_description_pattern.match(description)
        if match:
            potential_name = match.group(1).strip()
            # Basic validation - should be reasonable length
            if 2 <= len(potential_name.split()) <= 5 and len(potential_name) < 50:
                return potential_name
        
        # Fallback: take first few words if they look like a company name
        words = description.split()
        if len(words) >= 2:
            # Look for capitalized words at the beginning
            potential_name = []
            for word in words[:5]:
                if word[0].isupper() or word.isupper():
                    potential_name.append(word)
                else:
                    break
            
            if potential_name:
                name = ' '.join(potential_name)
                if len(name) < 50:
                    return name
        
        return None
    
    def search_company_info(self, query: str, website: Optional[str] = None) -> Dict:
        """Search for company information using SearxNG or fallback methods"""
        # For now, use domain-based extraction as SearxNG isn't set up
        company_info = {
            'found': False,
            'company_name': None,
            'description': None,
            'industry': None,
            'location': None
        }
        
        if website:
            domain = urlparse(website).netloc
            if domain:
                # Extract company name from domain
                # Remove common TLDs and www
                name_parts = domain.replace('www.', '').split('.')
                if name_parts:
                    potential_name = name_parts[0]
                    # Capitalize and clean
                    if len(potential_name) > 2:
                        company_info['company_name'] = potential_name.replace('-', ' ').replace('_', ' ').title()
                        company_info['found'] = True
                        company_info['data_source'] = 'domain_extraction'
        
        # Future: Implement actual web search when SearxNG is available
        # try:
        #     response = requests.get(f"{self.searx_url}/search", params=params, timeout=10)
        #     ... (existing search code)
        # except Exception as e:
        #     logger.error(f"Error searching for {query}: {str(e)}")
        
        return company_info
    
    def _extract_name_from_title(self, title: str) -> Optional[str]:
        """Extract company name from page title"""
        if not title:
            return None
            
        # Common patterns in page titles
        patterns = [
            r'^([^|\\-–]+?)(?:\s*[|\\-–]\s*)', # Before separator
            r'^([^:]+?)(?:\s*:\s*)',           # Before colon
            r'^(.+?)\s+(?:Inc|LLC|Corp|Company|Ltd)', # Company suffixes
        ]
        
        for pattern in patterns:
            match = re.match(pattern, title, re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                if 2 <= len(name.split()) <= 5 and len(name) < 50:
                    return name
        
        # Fallback: use whole title if reasonable
        if len(title) < 50 and not any(sep in title for sep in ['|', '-', '–', ':']):
            return title
        
        return None
    
    def _extract_industry_from_text(self, text: str) -> Optional[str]:
        """Extract industry from text content"""
        industry_keywords = {
            'Construction': ['construction', 'contractor', 'building', 'renovation'],
            'Technology': ['software', 'technology', 'IT', 'digital', 'tech'],
            'Healthcare': ['healthcare', 'medical', 'health', 'clinic', 'hospital'],
            'Retail': ['retail', 'store', 'shop', 'merchandise', 'sales'],
            'Manufacturing': ['manufacturing', 'production', 'factory', 'industrial'],
            'Finance': ['financial', 'banking', 'investment', 'insurance'],
            'Real Estate': ['real estate', 'property', 'realty', 'housing'],
            'Food Service': ['restaurant', 'food', 'dining', 'catering', 'cafe'],
            'Transportation': ['transportation', 'logistics', 'shipping', 'delivery'],
            'Professional Services': ['consulting', 'professional services', 'advisory']
        }
        
        text_lower = text.lower()
        
        for industry, keywords in industry_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return industry
        
        return None
    
    def clean_company_data(self, company_id: str, company_data: Dict) -> Dict:
        """Clean and enrich a single company's data"""
        cleaned = {
            'company_id': company_id,
            'original_name': company_data.get('company_name'),
            'cleaned_name': None,
            'enriched_data': {},
            'data_source': 'original',
            'confidence': 1.0
        }
        
        name = company_data.get('company_name', '')
        website = company_data.get('website_url') or company_data.get('website_domain', '')
        industry = company_data.get('industry_primary', '')
        
        # Case 1: Person name as company name with website
        if name and self.person_name_pattern.match(name) and website:
            # Search for company info using website
            search_result = self.search_company_info(f"{name} {website}", website)
            
            if search_result['found'] and search_result['company_name']:
                cleaned['cleaned_name'] = search_result['company_name']
                cleaned['enriched_data'] = search_result
                cleaned['data_source'] = 'web_search'
                cleaned['confidence'] = 0.8
            else:
                # Try searching just the website
                domain = urlparse(website).netloc
                if domain:
                    search_result = self.search_company_info(domain, website)
                    if search_result['found'] and search_result['company_name']:
                        cleaned['cleaned_name'] = search_result['company_name']
                        cleaned['enriched_data'] = search_result
                        cleaned['data_source'] = 'web_search'
                        cleaned['confidence'] = 0.7
        
        # Case 2: Long description as company name or description pattern detected
        elif name and (len(name) > 100 or 'specializes' in name.lower() or 'provides' in name.lower()):
            extracted_name = self.extract_company_name_from_description(name)
            if extracted_name:
                cleaned['cleaned_name'] = extracted_name
                cleaned['data_source'] = 'extracted'
                cleaned['confidence'] = 0.9
                
                # Try to enrich with web search
                if website:
                    search_result = self.search_company_info(extracted_name, website)
                    if search_result['found']:
                        cleaned['enriched_data'] = search_result
                        if search_result['company_name']:
                            cleaned['cleaned_name'] = search_result['company_name']
                            cleaned['data_source'] = 'web_search'
        
        # Case 3: Missing company name but has website
        elif not name and website:
            domain = urlparse(website).netloc
            if domain:
                search_result = self.search_company_info(domain, website)
                if search_result['found'] and search_result['company_name']:
                    cleaned['cleaned_name'] = search_result['company_name']
                    cleaned['enriched_data'] = search_result
                    cleaned['data_source'] = 'web_search'
                    cleaned['confidence'] = 0.6
        
        # If no cleaning needed or possible
        if not cleaned['cleaned_name'] and name:
            cleaned['cleaned_name'] = name
            cleaned['data_source'] = 'original'
            cleaned['confidence'] = 1.0
        
        return cleaned
    
    def process_companies_batch(self, companies: List[Dict], batch_id: int) -> List[Dict]:
        """Process a batch of companies with parallel searches"""
        logger.info(f"Processing batch {batch_id} with {len(companies)} companies")
        
        cleaned_companies = []
        
        # Use thread pool for parallel processing
        with ThreadPoolExecutor(max_workers=10) as executor:
            # Submit all tasks
            future_to_company = {
                executor.submit(self.clean_company_data, company['company_id'], company): company
                for company in companies
            }
            
            # Process completed tasks
            for future in as_completed(future_to_company):
                company = future_to_company[future]
                try:
                    cleaned_data = future.result()
                    cleaned_companies.append(cleaned_data)
                    
                    # Log progress
                    if len(cleaned_companies) % 10 == 0:
                        logger.info(f"Batch {batch_id}: Processed {len(cleaned_companies)}/{len(companies)}")
                    
                    # Rate limiting
                    time.sleep(0.1)  # Avoid overwhelming search service
                    
                except Exception as e:
                    logger.error(f"Error processing company {company.get('company_id')}: {str(e)}")
                    # Add with original data
                    cleaned_companies.append({
                        'company_id': company.get('company_id'),
                        'original_name': company.get('company_name'),
                        'cleaned_name': company.get('company_name'),
                        'error': str(e),
                        'data_source': 'original',
                        'confidence': 0.0
                    })
        
        return cleaned_companies
    
    def save_to_s3(self, data: pd.DataFrame, filename: str):
        """Save dataframe to S3 bucket"""
        # Always save locally first
        local_path = f"/cleaning_data/{filename}"
        data.to_csv(local_path, index=False)
        logger.info(f"Saved locally to {local_path}")
        
        if not self.s3_client:
            logger.warning("S3 client not initialized, file saved locally only")
            return local_path
        
        try:
            # Convert to CSV
            csv_buffer = data.to_csv(index=False)
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=filename,
                Body=csv_buffer,
                ContentType='text/csv'
            )
            
            logger.info(f"Saved {filename} to S3 bucket {self.s3_bucket}")
            return f"s3://{self.s3_bucket}/{filename}"
            
        except Exception as e:
            logger.error(f"Error saving to S3: {str(e)}")
            # Fallback to local save
            local_path = f"/cleaning_data/{filename}"
            data.to_csv(local_path, index=False)
            return local_path
    
    def run_cleaning_process(self, batch_size: int = 1000):
        """Run the complete cleaning process for Non-PPP companies"""
        try:
            # Step 1: Analyze issues
            logger.info("Analyzing Non-PPP companies...")
            issues = self.analyze_non_ppp_companies()
            
            # Save analysis report
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            with open(f'/cleaning_data/data_quality_analysis_{timestamp}.json', 'w') as f:
                json.dump(issues, f, indent=2)
            
            # Step 2: Get all Non-PPP companies
            conn = sqlite3.connect(self.db_path)
            query = """
            SELECT company_id, company_name, website_url, industry_primary, description, 
                   city, state, employees, founded_year, address, zip_code,
                   business_type, loan_amount, source_type, website_domain
            FROM companies
            WHERE (loan_amount IS NULL OR loan_amount = 0) 
                  AND (source_type IS NULL OR source_type != 'PPP_LOAN')
            """
            
            df_original = pd.read_sql_query(query, conn)
            logger.info(f"Found {len(df_original)} Non-PPP companies")
            
            # Save original data to S3
            original_filename = f"non_ppp_companies_original_{timestamp}.csv"
            self.save_to_s3(df_original, original_filename)
            
            # Convert to list of dicts for processing
            companies = df_original.to_dict('records')
            
            # Step 3: Process in batches
            all_cleaned = []
            total_batches = (len(companies) + batch_size - 1) // batch_size
            
            for i in range(0, len(companies), batch_size):
                batch = companies[i:i + batch_size]
                batch_id = i // batch_size + 1
                
                logger.info(f"Processing batch {batch_id}/{total_batches}")
                cleaned_batch = self.process_companies_batch(batch, batch_id)
                all_cleaned.extend(cleaned_batch)
                
                # Save intermediate results
                if batch_id % 5 == 0:
                    intermediate_df = pd.DataFrame(all_cleaned)
                    intermediate_filename = f"cleaning_progress_batch_{batch_id}_{timestamp}.csv"
                    self.save_to_s3(intermediate_df, intermediate_filename)
            
            # Step 4: Create cleaned dataset
            cleaning_df = pd.DataFrame(all_cleaned)
            
            # Merge with original data
            df_cleaned = df_original.merge(
                cleaning_df[['company_id', 'cleaned_name', 'data_source', 'confidence', 'enriched_data']],
                on='company_id',
                how='left'
            )
            
            # Update company names
            df_cleaned['original_company_name'] = df_cleaned['company_name']
            df_cleaned['company_name'] = df_cleaned['cleaned_name'].fillna(df_cleaned['company_name'])
            
            # Add enriched data where available
            for idx, row in df_cleaned.iterrows():
                if pd.notna(row['enriched_data']) and isinstance(row['enriched_data'], dict):
                    enriched = row['enriched_data']
                    if enriched.get('industry') and pd.isna(row['industry_primary']):
                        df_cleaned.at[idx, 'industry_primary'] = enriched['industry']
                    if enriched.get('description') and pd.isna(row['description']):
                        df_cleaned.at[idx, 'description'] = enriched['description']
            
            # Save cleaned data
            cleaned_filename = f"non_ppp_companies_cleaned_{timestamp}.csv"
            self.save_to_s3(df_cleaned, cleaned_filename)
            
            # Step 5: Create summary report
            summary = {
                'timestamp': timestamp,
                'total_companies': len(df_original),
                'companies_cleaned': len(cleaning_df[cleaning_df['data_source'] != 'original']),
                'companies_enriched': len(cleaning_df[cleaning_df['enriched_data'].apply(lambda x: bool(x))]),
                'cleaning_sources': cleaning_df['data_source'].value_counts().to_dict(),
                'confidence_distribution': {
                    'high (>0.8)': len(cleaning_df[cleaning_df['confidence'] > 0.8]),
                    'medium (0.5-0.8)': len(cleaning_df[(cleaning_df['confidence'] >= 0.5) & (cleaning_df['confidence'] <= 0.8)]),
                    'low (<0.5)': len(cleaning_df[cleaning_df['confidence'] < 0.5])
                },
                'files_created': {
                    'original': original_filename,
                    'cleaned': cleaned_filename,
                    'analysis': f"data_quality_analysis_{timestamp}.json"
                }
            }
            
            # Save summary
            summary_filename = f"cleaning_summary_{timestamp}.json"
            with open(f'/cleaning_data/{summary_filename}', 'w') as f:
                json.dump(summary, f, indent=2)
            
            if self.s3_client:
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=summary_filename,
                    Body=json.dumps(summary, indent=2),
                    ContentType='application/json'
                )
            
            conn.close()
            
            logger.info(f"Cleaning process completed. Summary: {summary}")
            return summary
            
        except Exception as e:
            logger.error(f"Error in cleaning process: {str(e)}")
            raise