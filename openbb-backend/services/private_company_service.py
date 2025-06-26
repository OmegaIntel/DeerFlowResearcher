import sqlite3
import os
from typing import List, Dict, Optional, Tuple
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class PrivateCompanyService:
    def __init__(self):
        # Database paths
        self.main_db_path = os.getenv('PRIVATE_COMPANY_DB_PATH', '/data/company_database.db')
        self.incremental_db_path = os.getenv('PRIVATE_COMPANY_INCREMENTAL_DB_PATH', '/data/incremental_companies.db')
        
        # Verify databases exist
        if not os.path.exists(self.main_db_path):
            logger.warning(f"Main database not found at {self.main_db_path}")
        if not os.path.exists(self.incremental_db_path):
            logger.warning(f"Incremental database not found at {self.incremental_db_path}")
    
    @contextmanager
    def get_db_connection(self, db_path: str):
        """Context manager for database connections"""
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
        finally:
            conn.close()
    
    def get_companies(
        self,
        page: int = 1,
        limit: int = 100,
        search: Optional[str] = None,
        filters: Optional[Dict] = None
    ) -> Tuple[List[Dict], int]:
        """Get paginated list of companies with optional search and filters"""
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
                total_count = conn.execute(count_query, count_params).fetchone()[0]
                
                # Get paginated results
                query_params = params + [limit, offset]
                cursor = conn.execute(base_query, query_params)
                
                # Convert to list of dicts
                companies = []
                for row in cursor:
                    companies.append(dict(row))
                
                return companies, total_count
                
        except Exception as e:
            logger.error(f"Error fetching companies: {str(e)}")
            return [], 0
    
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
                # Get unique industries
                cursor = conn.execute("""
                    SELECT DISTINCT industry_primary 
                    FROM companies 
                    WHERE industry_primary IS NOT NULL 
                    ORDER BY industry_primary
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