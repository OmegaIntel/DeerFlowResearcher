import React, { useState } from 'react';
import { ChevronDown, Plus, Search, Filter, LayoutGrid, List, MoreHorizontal } from 'lucide-react';
import DealWorklistView from './DealWorklistView';
import DealTimelineView from './DealTimelineView';
import { useDealroom } from '../../hooks/useDealroom';

type ViewType = 'worklist' | 'timeline';
type WorklistFilter = 'all' | 'integration-plan' | 'due-diligence' | 'communications' | 'finance' | 'general' | 'human-resource' | 'it' | 'procurement' | 'sales-operations';

const DealroomPage: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('worklist');
  const [selectedWorklist, setSelectedWorklist] = useState<WorklistFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  const {
    deals,
    categories,
    isLoading,
    error,
    filters,
    updateFilters,
    updateDealStatus,
    addDeal,
    refetch
  } = useDealroom();

  const worklistCategories = [
    { id: 'all', label: 'All worklists', count: deals.length },
    { id: 'integration-plan', label: 'Integration Plan - Day 1', count: 0 },
    { id: 'due-diligence', label: 'Due Diligence List', count: deals.filter(d => d.category === 'due-diligence').length },
    { id: 'communications', label: 'Communications', count: 0 },
    { id: 'finance', label: 'Finance', count: deals.filter(d => d.category === 'finance').length },
    { id: 'general', label: 'General', count: 0 },
    { id: 'human-resource', label: 'Human Resource', count: deals.filter(d => d.category === 'human-resource').length },
    { id: 'it', label: 'IT', count: 0 },
    { id: 'procurement', label: 'Procurement', count: 0 },
    { id: 'sales-operations', label: 'Sales and Operations', count: deals.filter(d => d.category === 'sales-operations').length },
  ];

  const filteredDeals = deals.filter(deal => {
    if (selectedWorklist !== 'all' && deal.category !== selectedWorklist) return false;
    if (searchQuery && !deal.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filters.status && deal.status !== filters.status) return false;
    if (filters.assignee && deal.assignee !== filters.assignee) return false;
    return true;
  });

  return (
    <div className="h-full flex bg-openbb-bg-primary">
      {/* Left Sidebar */}
      <div className="w-64 bg-openbb-bg-widget border-r border-openbb-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-openbb-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-openbb-text-primary">Power Partnerships</h1>
            <button className="p-1 hover:bg-openbb-bg-hover rounded">
              <MoreHorizontal size={20} className="text-openbb-text-muted" />
            </button>
          </div>
          
          {/* View Tabs */}
          <div className="flex gap-4 text-sm">
            <button
              onClick={() => setActiveView('worklist')}
              className={`pb-2 border-b-2 transition-colors ${
                activeView === 'worklist'
                  ? 'text-openbb-text-primary border-openbb-accent'
                  : 'text-openbb-text-muted border-transparent hover:text-openbb-text-primary'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={`pb-2 border-b-2 transition-colors ${
                activeView === 'timeline'
                  ? 'text-openbb-text-primary border-openbb-accent'
                  : 'text-openbb-text-muted border-transparent hover:text-openbb-text-primary'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>

        {/* Worklist Categories */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-openbb-text-primary">Worklists</h2>
              <button className="p-1 hover:bg-openbb-bg-hover rounded">
                <Plus size={16} className="text-openbb-text-muted" />
              </button>
            </div>
            
            <div className="space-y-1">
              {worklistCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedWorklist(category.id as WorklistFilter)}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                    selectedWorklist === category.id
                      ? 'bg-openbb-bg-hover text-openbb-text-primary'
                      : 'text-openbb-text-muted hover:bg-openbb-bg-hover hover:text-openbb-text-primary'
                  }`}
                >
                  <div className="flex items-center">
                    {category.id !== 'all' && (
                      <ChevronDown size={14} className="mr-2 opacity-50" />
                    )}
                    <span className="flex-1">{category.label}</span>
                    {category.count > 0 && (
                      <span className="text-xs opacity-60">{category.count}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-openbb-bg-widget border-b border-openbb-border px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-openbb-text-muted" size={18} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-openbb-bg-secondary border border-openbb-border rounded text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 bg-openbb-bg-secondary border border-openbb-border rounded text-sm text-openbb-text-primary hover:border-openbb-accent transition-colors">
                  Due date <ChevronDown size={14} className="inline ml-1" />
                </button>
                <button className="px-3 py-1.5 bg-openbb-bg-secondary border border-openbb-border rounded text-sm text-openbb-text-primary hover:border-openbb-accent transition-colors">
                  Rooms <ChevronDown size={14} className="inline ml-1" />
                </button>
                <button className="px-3 py-1.5 bg-openbb-bg-secondary border border-openbb-border rounded text-sm text-openbb-text-primary hover:border-openbb-accent transition-colors">
                  Categories <ChevronDown size={14} className="inline ml-1" />
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-1.5 hover:bg-openbb-bg-hover rounded"
                >
                  <Filter size={18} className="text-openbb-text-muted" />
                </button>
              </div>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 ml-4">
              <button className="p-1.5 hover:bg-openbb-bg-hover rounded">
                <LayoutGrid size={18} className="text-openbb-text-muted" />
              </button>
              <button className="p-1.5 bg-openbb-bg-hover rounded">
                <List size={18} className="text-openbb-text-primary" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {activeView === 'worklist' ? (
            <DealWorklistView
              deals={filteredDeals}
              onUpdateStatus={updateDealStatus}
              onAddDeal={addDeal}
              selectedCategory={selectedWorklist}
            />
          ) : (
            <DealTimelineView
              deals={filteredDeals}
              onUpdateStatus={updateDealStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DealroomPage;