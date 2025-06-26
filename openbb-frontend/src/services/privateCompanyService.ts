const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1';

export interface PrivateCompany {
  company_id: string;
  company_name: string;
  website_domain: string;
  website_url: string;
  pitchbook_url: string;
  pitchbook_id: string;
  description: string;
  industry_primary: string;
  industry_secondary: string;
  business_model: string;
  status: string;
  founded_year: number;
  location: string;
  employee_count: number;
  linkedin_url: string;
  data_source_file: string;
  source_file_format: string;
  data_quality_score: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  employees: number;
  loan_amount: number;
  business_type: string;
  nonprofit: string;
  franchise_name: string;
  date_approved: string;
  naics_code: string;
  source_type: string;
}

export interface CompanyListResponse {
  companies: PrivateCompany[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
  };
}

export interface FilterOptions {
  industries: string[];
  states: string[];
  statuses: string[];
  sources: string[];
}

export interface CompanyFilters {
  industry_primary?: string;
  state?: string;
  status?: string;
  founded_year_min?: number;
  founded_year_max?: number;
  employee_count_min?: number;
  employee_count_max?: number;
  data_source?: string;
  exclude_ppp?: boolean;
}

class PrivateCompanyService {
  async getCompanies(
    page: number = 1,
    limit: number = 100,
    search?: string,
    filters?: CompanyFilters
  ): Promise<CompanyListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${API_BASE_URL}/private-companies/list?${params}`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch companies');
    }
  }

  async searchCompanies(query: string, limit: number = 50): Promise<PrivateCompany[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/private-companies/search?${params}`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to search companies');
    }
  }

  async getCompanyById(companyId: string): Promise<PrivateCompany> {
    const response = await fetch(`${API_BASE_URL}/private-companies/${companyId}`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Company not found');
    }
  }

  async getStatistics(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/private-companies/statistics`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch statistics');
    }
  }

  async getFilterOptions(): Promise<FilterOptions> {
    const response = await fetch(`${API_BASE_URL}/private-companies/filters`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch filter options');
    }
  }

  async semanticSearch(query: string, limit: number = 100): Promise<{
    companies: PrivateCompany[];
    total_count: number;
    parsed_query: any;
  }> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/private-companies/semantic-search?${params}`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Semantic search failed');
    }
  }

  exportToCSV(companies: PrivateCompany[]): void {
    if (companies.length === 0) {
      alert('No companies to export');
      return;
    }

    // Get all column headers
    const headers = Object.keys(companies[0]);
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    companies.forEach(company => {
      const row = headers.map(header => {
        const value = company[header as keyof PrivateCompany];
        // Escape values containing commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      });
      csvContent += row.join(',') + '\n';
    });

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `private_companies_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const privateCompanyService = new PrivateCompanyService();
// Types are already exported above