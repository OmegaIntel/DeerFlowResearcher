"""
MindsDB Service
Provides integration with MindsDB for unified data querying and AI-powered analytics
"""
import logging
import json
from typing import Dict, Any, List, Optional
import httpx
import asyncio
from datetime import datetime

logger = logging.getLogger(__name__)

class MindsDBService:
    def __init__(self):
        self.base_url = "http://mindsdb:47334"
        self.auth = ("mindsdb", "mindsdb")
        self.connected_sources = {}
        
    async def check_connection(self) -> bool:
        """Check if MindsDB server is accessible"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/status")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"MindsDB connection failed: {e}")
            return False
    
    async def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute SQL query on MindsDB"""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/sql/query",
                    json={"query": query},
                    auth=self.auth
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "data": response.json(),
                        "query": query
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Query failed: {response.text}",
                        "query": query
                    }
        except Exception as e:
            logger.error(f"MindsDB query execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "query": query
            }
    
    async def create_data_source(self, source_name: str, source_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new data source connection in MindsDB"""
        try:
            # Build CREATE DATABASE query
            params_str = ", ".join([f"'{k}': '{v}'" for k, v in parameters.items()])
            query = f"""
            CREATE DATABASE {source_name}
            WITH ENGINE = '{source_type}',
            PARAMETERS = {{{params_str}}}
            """
            
            result = await self.execute_query(query)
            
            if result["success"]:
                self.connected_sources[source_name] = {
                    "type": source_type,
                    "parameters": parameters,
                    "created_at": datetime.now().isoformat()
                }
            
            return result
        except Exception as e:
            logger.error(f"Failed to create data source {source_name}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def list_data_sources(self) -> Dict[str, Any]:
        """List all connected data sources"""
        try:
            query = "SHOW DATABASES"
            result = await self.execute_query(query)
            return result
        except Exception as e:
            logger.error(f"Failed to list data sources: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_model(self, model_name: str, query: str, predict_column: str) -> Dict[str, Any]:
        """Create a machine learning model in MindsDB"""
        try:
            ml_query = f"""
            CREATE MODEL {model_name}
            FROM ({query})
            PREDICT {predict_column}
            """
            
            result = await self.execute_query(ml_query)
            return result
        except Exception as e:
            logger.error(f"Failed to create model {model_name}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_model_predictions(self, model_name: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get predictions from a trained model"""
        try:
            # Build WHERE clause from input data
            where_clauses = []
            for key, value in input_data.items():
                if isinstance(value, str):
                    where_clauses.append(f"{key} = '{value}'")
                else:
                    where_clauses.append(f"{key} = {value}")
            
            where_clause = " AND ".join(where_clauses)
            
            query = f"""
            SELECT * FROM {model_name}
            WHERE {where_clause}
            """
            
            result = await self.execute_query(query)
            return result
        except Exception as e:
            logger.error(f"Failed to get predictions from {model_name}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_agent(self, agent_name: str, model: str, skills: List[str] = None) -> Dict[str, Any]:
        """Create an AI agent in MindsDB"""
        try:
            skills_list = skills or []
            skills_str = ", ".join([f"'{skill}'" for skill in skills_list])
            
            query = f"""
            CREATE AGENT {agent_name}
            USING
                model = '{model}',
                skills = [{skills_str}]
            """
            
            result = await self.execute_query(query)
            return result
        except Exception as e:
            logger.error(f"Failed to create agent {agent_name}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def query_agent(self, agent_name: str, question: str) -> Dict[str, Any]:
        """Ask a question to an AI agent"""
        try:
            # Use MindsDB agent API
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/agents/{agent_name}/completion",
                    json={"message": question},
                    auth=self.auth
                )
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "data": response.json(),
                        "question": question
                    }
                else:
                    return {
                        "success": False,
                        "error": f"Agent query failed: {response.text}",
                        "question": question
                    }
        except Exception as e:
            logger.error(f"Failed to query agent {agent_name}: {e}")
            return {
                "success": False,
                "error": str(e),
                "question": question
            }
    
    async def get_unified_financial_data(self, symbol: str, data_types: List[str] = None) -> Dict[str, Any]:
        """Get unified financial data across multiple sources"""
        try:
            data_types = data_types or ["price", "fundamentals", "news"]
            
            # Build unified query across multiple data sources
            queries = []
            
            if "price" in data_types:
                queries.append(f"""
                SELECT 'price' as data_type, * FROM yahoo_finance.prices 
                WHERE symbol = '{symbol}'
                """)
            
            if "fundamentals" in data_types:
                queries.append(f"""
                SELECT 'fundamentals' as data_type, * FROM fmp.fundamentals 
                WHERE symbol = '{symbol}'
                """)
            
            if "news" in data_types:
                queries.append(f"""
                SELECT 'news' as data_type, * FROM benzinga.news 
                WHERE symbol = '{symbol}'
                """)
            
            # Union all queries
            unified_query = " UNION ALL ".join(queries)
            
            result = await self.execute_query(unified_query)
            return result
        except Exception as e:
            logger.error(f"Failed to get unified data for {symbol}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def setup_openbb_connections(self) -> Dict[str, Any]:
        """Setup connections to existing OpenBB data sources"""
        connections = []
        
        # Setup connections for each data provider
        data_sources = [
            {
                "name": "yahoo_finance",
                "type": "http_api",
                "parameters": {
                    "base_url": "https://query1.finance.yahoo.com/v8/finance/chart/",
                    "format": "json"
                }
            },
            {
                "name": "fmp",
                "type": "http_api", 
                "parameters": {
                    "base_url": "https://financialmodelingprep.com/api/v3/",
                    "api_key": "{{FMP_API_KEY}}"
                }
            },
            {
                "name": "alpha_vantage",
                "type": "http_api",
                "parameters": {
                    "base_url": "https://www.alphavantage.co/query",
                    "api_key": "{{ALPHA_VANTAGE_API_KEY}}"
                }
            },
            {
                "name": "polygon",
                "type": "http_api",
                "parameters": {
                    "base_url": "https://api.polygon.io/v2/",
                    "api_key": "{{POLYGON_API_KEY}}"
                }
            }
        ]
        
        results = []
        for source in data_sources:
            try:
                result = await self.create_data_source(
                    source["name"],
                    source["type"], 
                    source["parameters"]
                )
                results.append({
                    "source": source["name"],
                    "result": result
                })
            except Exception as e:
                results.append({
                    "source": source["name"],
                    "result": {"success": False, "error": str(e)}
                })
        
        return {
            "success": True,
            "connections": results
        }
    
    async def create_integration_connection(self, integration_id: str, connection_params: Dict[str, Any]) -> Dict[str, Any]:
        """Create a connection for a specific integration type"""
        try:
            # Map integration IDs to MindsDB engine types
            integration_mapping = {
                'salesforce': 'salesforce',
                'gmail': 'gmail',
                'google_drive': 'google_drive',
                'google_sheets': 'sheets',
                'slack': 'slack_app',
                'github': 'github',
                'stripe': 'stripe',
                'shopify': 'shopify',
                'hubspot': 'hubspot',
                'binance': 'binance',
                'plaid': 'plaid',
                'paypal': 'paypal',
                's3': 's3',
                'onedrive': 'onedrive',
                'snowflake': 'snowflake',
                'bigquery': 'bigquery',
                'redshift': 'redshift'
            }
            
            if integration_id not in integration_mapping:
                return {
                    "success": False,
                    "error": f"Unknown integration type: {integration_id}"
                }
            
            engine = integration_mapping[integration_id]
            connection_name = f"{integration_id}_connection"
            
            # Create the connection
            result = await self.create_data_source(
                connection_name,
                engine,
                connection_params
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to create integration connection for {integration_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_natural_language_query(self, query: str, integration: str) -> Dict[str, Any]:
        """Process natural language query based on integration type"""
        try:
            # Map integration types to appropriate queries
            if integration == "financial_analyst":
                # Use MindsDB's AI capabilities for financial analysis
                sql_query = f"""
                SELECT 
                    '{query}' as question,
                    'Based on available financial data, here is my analysis: [This would normally contain real analysis from MindsDB AI models]' as answer,
                    NOW() as timestamp
                """
            elif integration in ["postgresql", "mysql", "mongodb", "redshift"]:
                # For database integrations, try to convert natural language to SQL
                if "show" in query.lower() or "list" in query.lower():
                    sql_query = f"SHOW TABLES FROM {integration}"
                else:
                    sql_query = query  # Pass through the query
            elif integration == "snowflake":
                # Snowflake specific queries
                if "show databases" in query.lower():
                    sql_query = "SHOW DATABASES IN ACCOUNT"
                else:
                    sql_query = query
            elif integration == "bigquery":
                # BigQuery specific handling
                sql_query = query  # BigQuery uses standard SQL
            elif integration == "salesforce":
                # Salesforce SOQL queries
                if "opportunities" in query.lower():
                    sql_query = "SELECT Id, Name, Amount, StageName, CloseDate FROM salesforce.Opportunity WHERE StageName = 'Closed Won' LIMIT 10"
                elif "accounts" in query.lower():
                    sql_query = "SELECT Id, Name, AnnualRevenue, Industry FROM salesforce.Account ORDER BY AnnualRevenue DESC LIMIT 10"
                elif "leads" in query.lower():
                    sql_query = "SELECT Id, Name, Company, Status FROM salesforce.Lead WHERE Status = 'Open' LIMIT 10"
                else:
                    sql_query = query
            elif integration == "gmail":
                # Gmail integration
                if "messages" in query.lower() or "email" in query.lower():
                    sql_query = "SELECT * FROM gmail.messages WHERE label = 'INBOX' LIMIT 10"
                else:
                    sql_query = query
            elif integration == "google_drive":
                # Google Drive queries
                if "files" in query.lower():
                    sql_query = "SELECT * FROM google_drive.files WHERE mimeType = 'application/vnd.google-apps.spreadsheet' LIMIT 10"
                else:
                    sql_query = query
            elif integration == "google_sheets":
                # Google Sheets specific
                sql_query = f"SELECT * FROM sheets.data WHERE spreadsheet_id = 'your_sheet_id'"
            elif integration == "slack":
                # Slack integration
                if "messages" in query.lower():
                    sql_query = "SELECT * FROM slack.messages WHERE channel = 'general' LIMIT 20"
                elif "users" in query.lower():
                    sql_query = "SELECT * FROM slack.users WHERE is_active = true"
                else:
                    sql_query = query
            elif integration == "github":
                # GitHub queries
                if "issues" in query.lower():
                    sql_query = "SELECT * FROM github.issues WHERE state = 'open' ORDER BY created_at DESC LIMIT 20"
                elif "pull" in query.lower():
                    sql_query = "SELECT * FROM github.pull_requests WHERE state = 'open' ORDER BY created_at DESC LIMIT 20"
                else:
                    sql_query = query
            elif integration == "stripe":
                # Stripe payment data
                if "payments" in query.lower() or "charges" in query.lower():
                    sql_query = "SELECT * FROM stripe.charges WHERE status = 'succeeded' ORDER BY created DESC LIMIT 20"
                elif "customers" in query.lower():
                    sql_query = "SELECT * FROM stripe.customers ORDER BY created DESC LIMIT 20"
                else:
                    sql_query = query
            elif integration == "shopify":
                # Shopify e-commerce data
                if "orders" in query.lower():
                    sql_query = "SELECT * FROM shopify.orders WHERE financial_status = 'paid' ORDER BY created_at DESC LIMIT 20"
                elif "products" in query.lower():
                    sql_query = "SELECT * FROM shopify.products ORDER BY total_sales DESC LIMIT 20"
                else:
                    sql_query = query
            elif integration == "hubspot":
                # HubSpot CRM
                if "contacts" in query.lower():
                    sql_query = "SELECT * FROM hubspot.contacts ORDER BY createdate DESC LIMIT 20"
                elif "deals" in query.lower():
                    sql_query = "SELECT * FROM hubspot.deals WHERE dealstage = 'closedwon' ORDER BY closedate DESC LIMIT 20"
                else:
                    sql_query = query
            elif integration == "binance":
                # Binance crypto data
                if "price" in query.lower():
                    sql_query = "SELECT symbol, price, volume FROM binance.ticker WHERE symbol LIKE '%USDT' ORDER BY volume DESC LIMIT 10"
                else:
                    sql_query = query
            elif integration == "plaid":
                # Plaid financial data
                if "transactions" in query.lower():
                    sql_query = "SELECT * FROM plaid.transactions ORDER BY date DESC LIMIT 50"
                elif "accounts" in query.lower() or "balance" in query.lower():
                    sql_query = "SELECT * FROM plaid.accounts"
                else:
                    sql_query = query
            elif integration == "paypal":
                # PayPal transactions
                if "transactions" in query.lower():
                    sql_query = "SELECT * FROM paypal.transactions WHERE status = 'COMPLETED' ORDER BY create_time DESC LIMIT 20"
                else:
                    sql_query = query
            elif integration == "openai":
                # OpenAI model integration
                sql_query = f"""
                SELECT 
                    '{query}' as prompt,
                    openai_completion('{query}', 'gpt-3.5-turbo') as response
                """
            elif integration == "huggingface":
                # Hugging Face models
                sql_query = f"""
                SELECT 
                    '{query}' as input,
                    huggingface_predict('{query}', 'sentiment-analysis') as prediction
                """
            elif integration == "s3":
                # S3 file storage
                if "files" in query.lower() or "list" in query.lower():
                    sql_query = "SELECT * FROM s3.files WHERE bucket = 'your-bucket' LIMIT 20"
                else:
                    sql_query = query
            elif integration == "onedrive":
                # OneDrive files
                if "files" in query.lower():
                    sql_query = "SELECT * FROM onedrive.files WHERE type = 'file' LIMIT 20"
                else:
                    sql_query = query
            elif integration == "file":
                # File upload handling
                sql_query = f"SELECT * FROM uploaded_file LIMIT 100"
            else:
                # Default query passthrough
                sql_query = query
            
            # Execute the query
            result = await self.execute_query(sql_query)
            
            if result["success"]:
                # Format the response based on the data structure
                data = result.get("data", {})
                if isinstance(data, dict) and "data" in data:
                    return {
                        "type": "table",
                        "data": data["data"],
                        "column_names": data.get("column_names", [])
                    }
                else:
                    return {
                        "type": "text",
                        "data": str(data)
                    }
            else:
                return {
                    "type": "error",
                    "error_message": result.get("error", "Query failed")
                }
                
        except Exception as e:
            logger.error(f"Failed to process natural language query: {e}")
            return {
                "type": "error",
                "error_message": str(e)
            }

# Global service instance
mindsdb_service = MindsDBService()