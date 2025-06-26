"""
AWS RDS PostgreSQL service for OpenBB
Replacement for SQLite-based private company service
"""
import os
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool
from contextlib import contextmanager
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class AWSDBService:
    def __init__(self):
        self.db_config = {
            'host': os.getenv('AWS_RDS_HOST', 'localhost'),
            'port': int(os.getenv('AWS_RDS_PORT', 5432)),
            'database': os.getenv('AWS_RDS_DATABASE', 'openbb_db'),
            'user': os.getenv('AWS_RDS_USERNAME', 'openbb_admin'),
            'password': os.getenv('AWS_RDS_PASSWORD', '')
        }
        
        # Create connection pool for better performance
        self.pool = SimpleConnectionPool(
            1, 20,  # min and max connections
            **self.db_config
        )
        
    @contextmanager
    def get_db_connection(self):
        """Get a database connection from the pool"""
        conn = self.pool.getconn()
        try:
            yield conn
        finally:
            self.pool.putconn(conn)
    
    @contextmanager
    def get_db_cursor(self, conn):
        """Get a cursor with RealDictCursor for dict-like results"""
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        try:
            yield cursor
        finally:
            cursor.close()
    
    def search_companies(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for companies by name"""
        with self.get_db_connection() as conn:
            with self.get_db_cursor(conn) as cursor:
                search_query = """
                    SELECT * FROM companies 
                    WHERE LOWER(name) LIKE LOWER(%s)
                    ORDER BY name
                    LIMIT %s
                """
                cursor.execute(search_query, (f'%{query}%', limit))
                return cursor.fetchall()
    
    def get_company_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a company by exact name match"""
        with self.get_db_connection() as conn:
            with self.get_db_cursor(conn) as cursor:
                query = "SELECT * FROM companies WHERE LOWER(name) = LOWER(%s)"
                cursor.execute(query, (name,))
                return cursor.fetchone()
    
    def get_companies_by_industry(self, industry: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get companies by industry"""
        with self.get_db_connection() as conn:
            with self.get_db_cursor(conn) as cursor:
                query = """
                    SELECT * FROM companies 
                    WHERE LOWER(industry) = LOWER(%s)
                    ORDER BY funding_total DESC NULLS LAST
                    LIMIT %s
                """
                cursor.execute(query, (industry, limit))
                return cursor.fetchall()
    
    def get_top_funded_companies(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get top funded companies"""
        with self.get_db_connection() as conn:
            with self.get_db_cursor(conn) as cursor:
                query = """
                    SELECT * FROM companies 
                    WHERE funding_total IS NOT NULL
                    ORDER BY funding_total DESC
                    LIMIT %s
                """
                cursor.execute(query, (limit,))
                return cursor.fetchall()
    
    def get_recent_fundings(self, days: int = 30, limit: int = 50) -> List[Dict[str, Any]]:
        """Get companies with recent funding"""
        with self.get_db_connection() as conn:
            with self.get_db_cursor(conn) as cursor:
                query = """
                    SELECT * FROM companies 
                    WHERE last_funding_date IS NOT NULL 
                    AND last_funding_date >= CURRENT_DATE - INTERVAL '%s days'
                    ORDER BY last_funding_date DESC
                    LIMIT %s
                """
                cursor.execute(query, (days, limit))
                return cursor.fetchall()
    
    def insert_company(self, company_data: Dict[str, Any]) -> int:
        """Insert a new company"""
        with self.get_db_connection() as conn:
            with self.get_db_cursor(conn) as cursor:
                columns = list(company_data.keys())
                values = list(company_data.values())
                
                query = f"""
                    INSERT INTO companies ({', '.join(columns)})
                    VALUES ({', '.join(['%s'] * len(values))})
                    RETURNING id
                """
                cursor.execute(query, values)
                conn.commit()
                return cursor.fetchone()['id']
    
    def update_company(self, company_id: int, updates: Dict[str, Any]) -> bool:
        """Update company information"""
        with self.get_db_connection() as conn:
            with self.get_db_cursor(conn) as cursor:
                set_clause = ', '.join([f"{k} = %s" for k in updates.keys()])
                values = list(updates.values()) + [company_id]
                
                query = f"""
                    UPDATE companies 
                    SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """
                cursor.execute(query, values)
                conn.commit()
                return cursor.rowcount > 0
    
    def close(self):
        """Close all connections in the pool"""
        self.pool.closeall()

# Singleton instance
aws_db_service = AWSDBService()