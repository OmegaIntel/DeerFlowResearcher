const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export interface Deal {
  id: string;
  taskId: string;
  title: string;
  category: string;
  status: 'open' | 'in-progress' | 'resolved';
  assignee: {
    name: string;
    avatar?: string;
  };
  reviewers: Array<{
    name: string;
    avatar?: string;
  }>;
  pr?: string;
  findings?: number;
  comments?: number;
  attachments?: number;
  reply?: number;
  labels?: number;
  startDate: Date;
  dueDate: Date;
  completionPercentage?: number;
  updatedAt?: Date;
  createdAt?: Date;
}

export interface DealCategory {
  id: string;
  name: string;
  description?: string;
  dealCount: number;
}

export interface DealFilters {
  status?: string;
  assignee?: string;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

class DealroomService {
  async getDeals(filters?: DealFilters): Promise<{ deals: Deal[] }> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.assignee) params.append('assignee', filters.assignee);
      if (filters.category) params.append('category', filters.category);
      if (filters.dateRange) {
        params.append('start_date', filters.dateRange.start.toISOString());
        params.append('end_date', filters.dateRange.end.toISOString());
      }
    }

    const response = await fetch(`${API_BASE_URL}/dealroom/deals?${params}`);
    const data = await response.json();

    if (data.success) {
      // Transform dates
      const deals = data.data.deals.map((deal: any) => ({
        ...deal,
        startDate: new Date(deal.startDate),
        dueDate: new Date(deal.dueDate),
        updatedAt: deal.updatedAt ? new Date(deal.updatedAt) : undefined,
        createdAt: deal.createdAt ? new Date(deal.createdAt) : undefined,
      }));
      return { deals };
    } else {
      throw new Error(data.error || 'Failed to fetch deals');
    }
  }

  async getDealById(dealId: string): Promise<Deal> {
    const response = await fetch(`${API_BASE_URL}/dealroom/deals/${dealId}`);
    const data = await response.json();

    if (data.success) {
      return {
        ...data.data,
        startDate: new Date(data.data.startDate),
        dueDate: new Date(data.data.dueDate),
        updatedAt: data.data.updatedAt ? new Date(data.data.updatedAt) : undefined,
        createdAt: data.data.createdAt ? new Date(data.data.createdAt) : undefined,
      };
    } else {
      throw new Error(data.error || 'Failed to fetch deal');
    }
  }

  async updateDealStatus(dealId: string, status: string): Promise<Deal> {
    const response = await fetch(`${API_BASE_URL}/dealroom/deals/${dealId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to update deal status');
    }
  }

  async addDeal(deal: Partial<Deal>): Promise<Deal> {
    const response = await fetch(`${API_BASE_URL}/dealroom/deals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deal),
    });
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to add deal');
    }
  }

  async updateDeal(dealId: string, updates: Partial<Deal>): Promise<Deal> {
    const response = await fetch(`${API_BASE_URL}/dealroom/deals/${dealId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to update deal');
    }
  }

  async deleteDeal(dealId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/dealroom/deals/${dealId}`, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to delete deal');
    }
  }

  async getCategories(): Promise<DealCategory[]> {
    const response = await fetch(`${API_BASE_URL}/dealroom/categories`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch categories');
    }
  }

  async getStatistics(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/dealroom/statistics`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Failed to fetch statistics');
    }
  }

  // Mock data for development
  getMockDeals(): Deal[] {
    return [
      {
        id: '1',
        taskId: '349',
        title: 'Review financial statements and audit reports',
        category: 'due-diligence',
        status: 'open',
        assignee: { name: 'Kathryn Murphy' },
        reviewers: [{ name: 'Jerome Bell' }],
        findings: 1,
        comments: 1,
        attachments: 4,
        startDate: new Date('2024-08-28'),
        dueDate: new Date('2025-01-12'),
        completionPercentage: 50,
      },
      {
        id: '2',
        taskId: '776',
        title: 'Analyze corporate structure, including subsidiaries',
        category: 'due-diligence',
        status: 'resolved',
        assignee: { name: 'Jerome Bell' },
        reviewers: [{ name: 'Kathryn Murphy' }],
        startDate: new Date('2024-09-27'),
        dueDate: new Date('2025-05-30'),
        completionPercentage: 100,
      },
      {
        id: '3',
        taskId: '748',
        title: 'Review and analyze contracts and agreements',
        category: 'human-resource',
        status: 'open',
        assignee: { name: 'Leslie Alexander' },
        reviewers: [{ name: 'Kathryn Murphy' }],
        startDate: new Date('2024-11-16'),
        dueDate: new Date('2025-06-11'),
      },
      {
        id: '4',
        taskId: '230',
        title: 'Analyze employee benefit plans and compensation',
        category: 'human-resource',
        status: 'in-progress',
        assignee: { name: 'Arlene McCoy' },
        reviewers: [{ name: 'Jerome Bell' }],
        findings: 1,
        comments: 2,
        attachments: 1,
        startDate: new Date('2024-09-05'),
        dueDate: new Date('2025-06-21'),
        completionPercentage: 60,
      },
      {
        id: '5',
        taskId: '330',
        title: 'Review financial statements and audit reports',
        category: 'finance',
        status: 'open',
        assignee: { name: 'Jerome Bell' },
        reviewers: [],
        findings: 1,
        comments: 2,
        startDate: new Date('2025-01-02'),
        dueDate: new Date('2025-11-02'),
      },
      {
        id: '6',
        taskId: '330',
        title: 'Verify tax returns and supporting documents',
        category: 'finance',
        status: 'in-progress',
        assignee: { name: 'Jerome Bell' },
        reviewers: [],
        startDate: new Date('2025-04-06'),
        dueDate: new Date('2025-12-28'),
        completionPercentage: 40,
      },
      {
        id: '7',
        taskId: '330',
        title: 'Analyze sales and distribution channels',
        category: 'sales-operations',
        status: 'in-progress',
        assignee: { name: 'Leslie Alexander' },
        reviewers: [],
        comments: 1,
        attachments: 2,
        startDate: new Date('2024-11-22'),
        dueDate: new Date('2025-04-07'),
        completionPercentage: 75,
      },
    ];
  }
}

export const dealroomService = new DealroomService();