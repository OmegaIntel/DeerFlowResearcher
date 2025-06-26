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
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class OptimizedPrivateCompanyService:
    def __init__(self):
        # Database paths
        self.main_db_path = os.getenv('PRIVATE_COMPANY_DB_PATH', '/data/company_database.db')
        self.incremental_db_path = os.getenv('PRIVATE_COMPANY_INCREMENTAL_DB_PATH', '/data/incremental_companies.db')
        
        # Initialize Redis connection
        self.redis_client = redis.Redis(
            host=os.getenv('REDIS_HOST', 'redis'),
            port=int(os.getenv('REDIS_PORT', 6379)),
            decode_responses=True,
            db=1
        )
        
        # Cache configuration
        self.cache_ttl = 3600  # 1 hour
        self.short_cache_ttl = 300  # 5 minutes
        
        # Thread pool for database operations
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        # In-memory caches for frequently accessed data
        self._state_cache = {}
        self._industry_cache = {}
        self._filter_cache = {}
        
        # Verify databases exist
        if not os.path.exists(self.main_db_path):
            logger.warning(f"Main database not found at {self.main_db_path}")
        else:
            # Pre-load some data into memory
            self._initialize_caches()
    
    def _initialize_caches(self):
        """Pre-load frequently accessed data into memory"""
        try:
            logger.info("Initializing in-memory caches...")
            with self.get_db_connection(self.main_db_path) as conn:
                # Cache state counts
                cursor = conn.execute("""
                    SELECT state, COUNT(*) as count 
                    FROM companies 
                    WHERE state IS NOT NULL 
                    GROUP BY state
                """)
                self._state_cache = {row[0]: row[1] for row in cursor}
                
                # Cache top industries
                cursor = conn.execute("""
                    SELECT industry_primary, COUNT(*) as count 
                    FROM companies 
                    WHERE industry_primary IS NOT NULL 
                    GROUP BY industry_primary 
                    ORDER BY count DESC 
                    LIMIT 100
                """)
                self._industry_cache = {row[0]: row[1] for row in cursor}
                
            logger.info(f"Cached {len(self._state_cache)} states and {len(self._industry_cache)} industries")
            
            # Pre-cache first page
            self._precache_first_page()
            
        except Exception as e:
            logger.error(f"Error initializing caches: {str(e)}")
    
    def _precache_first_page(self):
        """Pre-cache the first page of results"""
        try:
            # Cache first page without filters
            self.get_companies(page=1, limit=100, use_cache=False)
            
            # Cache first page for popular states
            for state in ['CA', 'NY', 'TX', 'FL'][:2]:  # Only cache top 2
                if state in self._state_cache:
                    self.get_companies(
                        page=1, 
                        limit=100, 
                        filters={'state': state},
                        use_cache=False
                    )
            
            logger.info("Pre-cached initial pages")
        except Exception as e:
            logger.error(f"Error pre-caching: {str(e)}")
    
    @contextmanager
    def get_db_connection(self, db_path: str):
        """Context manager for database connections with optimizations"""
        conn = sqlite3.connect(db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        
        # Enable optimizations for read-only database
        conn.execute("PRAGMA query_only = ON")
        conn.execute("PRAGMA cache_size = -64000")  # 64MB cache
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA mmap_size = 268435456")  # 256MB memory map
        
        try:
            yield conn
        finally:
            conn.close()
    
    def _get_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from parameters"""
        sorted_kwargs = sorted(kwargs.items())
        key_string = f"{prefix}:{str(sorted_kwargs)}"
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
                logger.debug(f"Cache hit for page {page}")
                return cached['companies'], cached['total_count']
        
        offset = (page - 1) * limit
        
        # For filtered queries, check if we can use in-memory counts
        if filters and not search and len(filters) == 1:
            if 'state' in filters and filters['state'] in self._state_cache:
                # Use cached state count for faster total
                total_count = self._state_cache[filters['state']]
            elif 'industry_primary' in filters and filters['industry_primary'] in self._industry_cache:
                total_count = self._industry_cache[filters['industry_primary']]
            else:
                total_count = None
        else:
            total_count = None
        
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
            for key, value in filters.items():
                if key == 'industry_primary':
                    where_clauses.append("industry_primary = ?")
                    params.append(value)
                elif key == 'state':
                    where_clauses.append("state = ?")
                    params.append(value)
                elif key == 'status':
                    where_clauses.append("status = ?")
                    params.append(value)
                elif key == 'founded_year_min':
                    where_clauses.append("founded_year >= ?")
                    params.append(value)
                elif key == 'founded_year_max':
                    where_clauses.append("founded_year <= ?")
                    params.append(value)
                elif key == 'employee_count_min':
                    where_clauses.append("(employee_count >= ? OR employees >= ?)")
                    params.extend([value] * 2)
                elif key == 'employee_count_max':
                    where_clauses.append("(employee_count <= ? OR employees <= ?)")
                    params.extend([value] * 2)
                elif key == 'data_source':
                    if value == 'Non-PPP Companies':
                        # Filter for non-PPP companies
                        where_clauses.append("(loan_amount IS NULL OR loan_amount = 0) AND (source_type IS NULL OR source_type != 'PPP_LOAN')")
                    else:
                        where_clauses.append("source_type = ?")
                        params.append(value)
                elif key == 'exclude_ppp' and value:
                    # Exclude companies with PPP loans (loan_amount > 0 or source_type = 'PPP_LOAN')
                    where_clauses.append("(loan_amount IS NULL OR loan_amount = 0) AND (source_type IS NULL OR source_type != 'PPP_LOAN')")
        
        # Combine where clauses
        if where_clauses:
            where_sql = " WHERE " + " AND ".join(where_clauses)
            base_query += where_sql
            count_query += where_sql
        
        # Add ordering and pagination
        base_query += " ORDER BY company_name ASC LIMIT ? OFFSET ?"
        
        try:
            with self.get_db_connection(self.main_db_path) as conn:
                # Get total count if not cached
                if total_count is None:
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
    
    def get_company_by_id(self, company_id: str) -> Optional[Dict]:
        """Get a single company by ID"""
        # Check cache first
        cache_key = f"pvtco:company:{company_id}"
        cached = self._get_cached_result(cache_key)
        if cached:
            return cached
        
        query = "SELECT * FROM companies WHERE company_id = ?"
        
        try:
            with self.get_db_connection(self.main_db_path) as conn:
                cursor = conn.execute(query, (company_id,))
                row = cursor.fetchone()
                
                if row:
                    company = dict(row)
                    # Cache the result
                    self._cache_result(cache_key, company, self.cache_ttl)
                    return company
                return None
                
        except Exception as e:
            logger.error(f"Error fetching company {company_id}: {str(e)}")
            return None
    
    def get_statistics(self) -> Dict:
        """Get database statistics from cache"""
        cache_key = "pvtco:statistics"
        cached = self._get_cached_result(cache_key)
        if cached:
            return cached
        
        stats = {
            'total_companies': 0,
            'by_status': {},
            'by_source': {},
            'by_industry': dict(list(self._industry_cache.items())[:10]),  # Top 10 from cache
            'by_state': dict(sorted(self._state_cache.items(), key=lambda x: x[1], reverse=True)[:10])
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
                
            # Cache the result
            self._cache_result(cache_key, stats, self.cache_ttl)
                
        except Exception as e:
            logger.error(f"Error fetching statistics: {str(e)}")
        
        return stats
    
    def get_filter_options(self) -> Dict:
        """Get available filter options from cache"""
        if self._filter_cache:
            return self._filter_cache
        
        cache_key = "pvtco:filters"
        cached = self._get_cached_result(cache_key)
        if cached:
            self._filter_cache = cached
            return cached
        
        options = {
            'industries': list(self._industry_cache.keys()),
            'states': sorted(self._state_cache.keys()),
            'statuses': [],
            'sources': []
        }
        
        try:
            with self.get_db_connection(self.main_db_path) as conn:
                # Get unique statuses
                cursor = conn.execute("""
                    SELECT DISTINCT status 
                    FROM companies 
                    WHERE status IS NOT NULL 
                    ORDER BY status
                    LIMIT 20
                """)
                options['statuses'] = [row[0] for row in cursor]
                
                # Get unique sources
                cursor = conn.execute("""
                    SELECT DISTINCT source_type 
                    FROM companies 
                    WHERE source_type IS NOT NULL 
                    ORDER BY source_type
                    LIMIT 20
                """)
                sources = [row[0] for row in cursor if row[0]]  # Filter out None values
                # Add user-friendly options
                options['sources'] = ['All Sources', 'Non-PPP Companies'] + sources
            
            # Cache the result
            self._cache_result(cache_key, options, self.cache_ttl * 2)
            self._filter_cache = options
                
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
            
            # Clear in-memory caches
            self._filter_cache = {}
            
            logger.info(f"Cleared cache for pattern: {pattern or 'all'}")
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")