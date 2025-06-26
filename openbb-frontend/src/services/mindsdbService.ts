/**
 * MindsDB Service
 * Handles all interactions with MindsDB API
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1';

export interface MindsDBStatus {
  connected: boolean;
  service: string;
}

export interface QueryResult {
  type: string;
  data: any[];
  column_names: string[];
  context?: any;
}

export interface DataSource {
  name: string;
  engine: string;
  connection_data?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  queryType?: string;
  error?: string;
}

export interface IntegrationOption {
  id: string;
  name: string;
  description: string;
  engine: string;
  requiredParams: string[];
  category: 'database' | 'api' | 'ml' | 'agent';
}

// Available MindsDB integrations
export const INTEGRATION_OPTIONS: IntegrationOption[] = [
  // Databases
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Connect to PostgreSQL database',
    engine: 'postgres',
    requiredParams: ['host', 'port', 'database', 'user', 'password'],
    category: 'database'
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Connect to MySQL database',
    engine: 'mysql',
    requiredParams: ['host', 'port', 'database', 'user', 'password'],
    category: 'database'
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'Connect to MongoDB database',
    engine: 'mongodb',
    requiredParams: ['host', 'port', 'database'],
    category: 'database'
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    description: 'Connect to Snowflake data warehouse',
    engine: 'snowflake',
    requiredParams: ['account', 'user', 'password', 'database', 'warehouse'],
    category: 'database'
  },
  {
    id: 'bigquery',
    name: 'Google BigQuery',
    description: 'Connect to Google BigQuery',
    engine: 'bigquery',
    requiredParams: ['project_id', 'dataset', 'service_account_json'],
    category: 'database'
  },
  {
    id: 'redshift',
    name: 'Amazon Redshift',
    description: 'Connect to Amazon Redshift',
    engine: 'redshift',
    requiredParams: ['host', 'port', 'database', 'user', 'password'],
    category: 'database'
  },
  // Applications
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Connect to Salesforce CRM',
    engine: 'salesforce',
    requiredParams: ['username', 'password', 'security_token'],
    category: 'api'
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Access Gmail messages',
    engine: 'gmail',
    requiredParams: ['credentials_file'],
    category: 'api'
  },
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Access Google Drive files',
    engine: 'google_drive',
    requiredParams: ['credentials_file'],
    category: 'api'
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Access Google Sheets data',
    engine: 'sheets',
    requiredParams: ['spreadsheet_id', 'sheet_name', 'credentials_file'],
    category: 'api'
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Access Slack messages and channels',
    engine: 'slack',
    requiredParams: ['bot_token'],
    category: 'api'
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Access GitHub repositories and data',
    engine: 'github',
    requiredParams: ['api_key'],
    category: 'api'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Access Stripe payment data',
    engine: 'stripe',
    requiredParams: ['api_key'],
    category: 'api'
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect to Shopify store data',
    engine: 'shopify',
    requiredParams: ['shop_url', 'access_token'],
    category: 'api'
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Access HubSpot CRM data',
    engine: 'hubspot',
    requiredParams: ['api_key'],
    category: 'api'
  },
  // Financial APIs
  {
    id: 'binance',
    name: 'Binance',
    description: 'Connect to Binance crypto data',
    engine: 'binance',
    requiredParams: ['api_key', 'api_secret'],
    category: 'api'
  },
  {
    id: 'plaid',
    name: 'Plaid',
    description: 'Access banking and financial data',
    engine: 'plaid',
    requiredParams: ['client_id', 'secret', 'access_token'],
    category: 'api'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Access PayPal transaction data',
    engine: 'paypal',
    requiredParams: ['client_id', 'client_secret'],
    category: 'api'
  },
  // AI/ML
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Use OpenAI models for predictions',
    engine: 'openai',
    requiredParams: ['api_key'],
    category: 'ml'
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Use Hugging Face models',
    engine: 'huggingface',
    requiredParams: ['api_key'],
    category: 'ml'
  },
  // Cloud Storage
  {
    id: 's3',
    name: 'Amazon S3',
    description: 'Access files from S3 buckets',
    engine: 's3',
    requiredParams: ['aws_access_key_id', 'aws_secret_access_key', 'bucket'],
    category: 'api'
  },
  {
    id: 'onedrive',
    name: 'Microsoft OneDrive',
    description: 'Access OneDrive files',
    engine: 'onedrive',
    requiredParams: ['client_id', 'client_secret', 'refresh_token'],
    category: 'api'
  },
  // File Sources
  {
    id: 'file',
    name: 'Upload File',
    description: 'Upload CSV, Excel, or JSON file',
    engine: 'file',
    requiredParams: ['file_path'],
    category: 'database'
  },
  // Agents
  {
    id: 'financial_analyst',
    name: 'Financial Analyst Agent',
    description: 'AI agent for financial analysis',
    engine: 'agent',
    requiredParams: ['model'],
    category: 'agent'
  }
];

class MindsDBService {
  async checkStatus(): Promise<MindsDBStatus> {
    try {
      const response = await axios.get(`${API_BASE_URL}/mindsdb/status`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to check MindsDB status:', error);
      throw error;
    }
  }

  async executeQuery(query: string): Promise<QueryResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/mindsdb/query`, { query });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Query execution failed');
    } catch (error) {
      console.error('Failed to execute query:', error);
      throw error;
    }
  }

  async listDataSources(): Promise<DataSource[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/mindsdb/data-sources`);
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to list data sources:', error);
      return [];
    }
  }

  async createDataSource(name: string, type: string, parameters: Record<string, any>): Promise<boolean> {
    try {
      const response = await axios.post(`${API_BASE_URL}/mindsdb/data-sources`, {
        name,
        type,
        parameters
      });
      return response.data.success;
    } catch (error) {
      console.error('Failed to create data source:', error);
      throw error;
    }
  }

  async queryAgent(agentName: string, question: string): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/mindsdb/agents/query`, {
        agent_name: agentName,
        question
      });
      if (response.data.success) {
        return response.data.data.response || response.data.data;
      }
      throw new Error(response.data.error || 'Agent query failed');
    } catch (error) {
      console.error('Failed to query agent:', error);
      throw error;
    }
  }

  async getFinancialInsights(symbol: string): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/mindsdb/financial-insights/${symbol}`);
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to get insights');
    } catch (error) {
      console.error('Failed to get financial insights:', error);
      throw error;
    }
  }

  async getUnifiedData(symbol: string, dataTypes: string[]): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/mindsdb/unified-data/${symbol}`, {
        params: { data_types: dataTypes.join(',') }
      });
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to get unified data');
    } catch (error) {
      console.error('Failed to get unified data:', error);
      throw error;
    }
  }

  // Helper to process natural language queries
  async processNaturalLanguageQuery(query: string, integrationId: string): Promise<QueryResult | string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/mindsdb/process`, {
        query,
        integration: integrationId
      });
      
      if (response.data.success) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Query processing failed');
    } catch (error) {
      console.error('Failed to process natural language query:', error);
      throw error;
    }
  }
}

export const mindsdbService = new MindsDBService();