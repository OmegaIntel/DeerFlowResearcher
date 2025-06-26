"""
Unified database service that supports both SQLite (local) and MySQL (AWS RDS)
Automatically selects the appropriate backend based on configuration
"""
import os
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Check if AWS RDS is configured
if os.getenv('AWS_RDS_HOST'):
    logger.info("Using AWS MySQL service")
    from .aws_mysql_service import aws_mysql_service as db_service
else:
    logger.info("Using local SQLite service")
    from .private_company_service import PrivateCompanyService
    db_service = PrivateCompanyService()

# Export unified interface
class UnifiedDBService:
    def __init__(self):
        self.backend = db_service
        
    def search_companies(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for companies by name"""
        return self.backend.search_companies(query, limit)
    
    def get_company_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a company by exact name match"""
        if hasattr(self.backend, 'get_company_by_name'):
            return self.backend.get_company_by_name(name)
        else:
            # Fallback for SQLite service
            companies = self.backend.search_companies(name, 1)
            if companies and companies[0]['name'].lower() == name.lower():
                return companies[0]
            return None
    
    def get_companies_by_industry(self, industry: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get companies by industry"""
        if hasattr(self.backend, 'get_companies_by_industry'):
            return self.backend.get_companies_by_industry(industry, limit)
        else:
            # Fallback implementation
            return []
    
    def get_top_funded_companies(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get top funded companies"""
        if hasattr(self.backend, 'get_top_funded_companies'):
            return self.backend.get_top_funded_companies(limit)
        else:
            # Fallback implementation
            return []
    
    def get_recent_fundings(self, days: int = 30, limit: int = 50) -> List[Dict[str, Any]]:
        """Get companies with recent funding"""
        if hasattr(self.backend, 'get_recent_fundings'):
            return self.backend.get_recent_fundings(days, limit)
        else:
            # Fallback implementation
            return []

# Singleton instance
unified_db_service = UnifiedDBService()