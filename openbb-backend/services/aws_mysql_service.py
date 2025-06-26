"""
AWS RDS MySQL service for OpenBB
Replacement for SQLite-based private company service
"""
import os
import pymysql
from pymysql.cursors import DictCursor
from DBUtils.PooledDB import PooledDB
from contextlib import contextmanager
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class AWSMySQLService:
    def __init__(self):
        self.db_config = {
            'host': os.getenv('AWS_RDS_HOST', 'omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com'),
            'port': int(os.getenv('AWS_RDS_PORT', 3306)),
            'database': os.getenv('AWS_RDS_DATABASE', 'omni_ai'),
            'user': os.getenv('AWS_RDS_USERNAME', 'admin'),
            'password': os.getenv('AWS_RDS_PASSWORD', '7atwj76e'),
            'charset': 'utf8mb4',
            'cursorclass': DictCursor
        }
        
        # Create connection pool for better performance
        self.pool = PooledDB(
            creator=pymysql,
            maxconnections=20,
            mincached=2,
            maxcached=5,
            blocking=True,
            maxusage=None,
            setsession=[],
            **self.db_config
        )
        
        logger.info(f"Connected to MySQL at {self.db_config['host']}")
        
    @contextmanager
    def get_db_connection(self):
        """Get a database connection from the pool"""
        conn = self.pool.connection()
        try:
            yield conn
        finally:
            conn.close()
    
    def search_companies(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for companies by name"""
        with self.get_db_connection() as conn:
            with conn.cursor() as cursor:
                search_query = """
                    SELECT * FROM companies 
                    WHERE LOWER(name) LIKE LOWER(%s)
                    ORDER BY name
                    LIMIT %s
                """
                cursor.execute(search_query, (f'%{query}%', limit))
                results = cursor.fetchall()
                return results or []
    
    def get_company_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a company by exact name match"""
        with self.get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = "SELECT * FROM companies WHERE LOWER(name) = LOWER(%s)"
                cursor.execute(query, (name,))
                return cursor.fetchone()
    
    def get_companies_by_industry(self, industry: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get companies by industry"""
        with self.get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT * FROM companies 
                    WHERE LOWER(industry) = LOWER(%s)
                    ORDER BY funding_total DESC
                    LIMIT %s
                """
                cursor.execute(query, (industry, limit))
                results = cursor.fetchall()
                return results or []
    
    def get_top_funded_companies(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get top funded companies"""
        with self.get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT * FROM companies 
                    WHERE funding_total IS NOT NULL AND funding_total > 0
                    ORDER BY funding_total DESC
                    LIMIT %s
                """
                cursor.execute(query, (limit,))
                results = cursor.fetchall()
                return results or []
    
    def get_recent_fundings(self, days: int = 30, limit: int = 50) -> List[Dict[str, Any]]:
        """Get companies with recent funding"""
        with self.get_db_connection() as conn:
            with conn.cursor() as cursor:
                query = """
                    SELECT * FROM companies 
                    WHERE last_funding_date IS NOT NULL 
                    AND last_funding_date >= DATE_SUB(CURDATE(), INTERVAL %s DAY)
                    ORDER BY last_funding_date DESC
                    LIMIT %s
                """
                cursor.execute(query, (days, limit))
                results = cursor.fetchall()
                return results or []
    
    def insert_company(self, company_data: Dict[str, Any]) -> int:
        """Insert a new company"""
        with self.get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Remove id if present in company_data
                if 'id' in company_data:
                    del company_data['id']
                
                columns = list(company_data.keys())
                values = list(company_data.values())
                placeholders = ', '.join(['%s'] * len(values))
                
                query = f"""
                    INSERT INTO companies ({', '.join(columns)})
                    VALUES ({placeholders})
                """
                cursor.execute(query, values)
                conn.commit()
                return cursor.lastrowid
    
    def update_company(self, company_id: int, updates: Dict[str, Any]) -> bool:
        """Update company information"""
        with self.get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Remove id and timestamps from updates
                updates = {k: v for k, v in updates.items() 
                          if k not in ['id', 'created_at', 'updated_at']}
                
                if not updates:
                    return False
                
                set_clause = ', '.join([f"{k} = %s" for k in updates.keys()])
                values = list(updates.values()) + [company_id]
                
                query = f"""
                    UPDATE companies 
                    SET {set_clause}
                    WHERE id = %s
                """
                cursor.execute(query, values)
                conn.commit()
                return cursor.rowcount > 0
    
    def batch_insert_companies(self, companies: List[Dict[str, Any]]) -> int:
        """Batch insert multiple companies"""
        if not companies:
            return 0
            
        with self.get_db_connection() as conn:
            with conn.cursor() as cursor:
                # Get columns from first company
                columns = list(companies[0].keys())
                if 'id' in columns:
                    columns.remove('id')
                
                placeholders = ', '.join(['%s'] * len(columns))
                query = f"""
                    INSERT INTO companies ({', '.join(columns)})
                    VALUES ({placeholders})
                    ON DUPLICATE KEY UPDATE
                    updated_at = CURRENT_TIMESTAMP
                """
                
                # Prepare values for batch insert
                values = []
                for company in companies:
                    row = [company.get(col) for col in columns]
                    values.append(row)
                
                cursor.executemany(query, values)
                conn.commit()
                return cursor.rowcount
    
    def close(self):
        """Close all connections in the pool"""
        # PooledDB handles connection closing automatically
        pass

# Singleton instance
aws_mysql_service = AWSMySQLService()