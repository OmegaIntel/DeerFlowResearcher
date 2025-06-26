import React, { useState } from 'react';
import { X, Search, Grid, ChevronDown, ChevronRight } from 'lucide-react';
import classNames from 'classnames';
import DataSourcesTable from './DataSourcesTable';

interface WidgetOption {
  id: string;
  name: string;
  category: string;
  description?: string;
  provider?: string;
  dataSource?: string[];
}

interface WidgetSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWidgets: (widgets: string[]) => void;
}

const widgetOptions: WidgetOption[] = [
  // Equity - Company Information
  { id: 'ticker-info', name: 'Ticker Information', category: 'Equity', provider: 'Multi', dataSource: ['Yahoo', 'FMP', 'Alpha Vantage'] },
  { id: 'company-profile', name: 'Company Profile', category: 'Equity', provider: 'FMP', dataSource: ['FMP', 'Polygon', 'Yahoo'] },
  { id: 'management-team', name: 'Management Team', category: 'Equity', provider: 'FMP', dataSource: ['FMP'] },
  { id: 'company-filings', name: 'Company Filings', category: 'Equity', provider: 'FMP', dataSource: ['FMP'] },
  { id: 'earnings-transcripts', name: 'Earnings Transcripts', category: 'Equity', provider: 'API Ninjas', dataSource: ['API Ninjas'] },
  
  // Equity - Price & Performance
  { id: 'price-performance', name: 'Price Performance', category: 'Equity', provider: 'Multi', dataSource: ['Yahoo', 'Alpha Vantage', 'Polygon'] },
  { id: 'price-chart', name: 'Price Chart', category: 'Equity', provider: 'Multi', dataSource: ['Yahoo', 'Alpha Vantage', 'Polygon'] },
  { id: 'volume-chart', name: 'Volume Chart', category: 'Equity', provider: 'Multi', dataSource: ['Yahoo', 'Alpha Vantage', 'Polygon'] },
  
  // Equity - Fundamental Analysis
  { id: 'key-metrics', name: 'Key Metrics', category: 'Equity', provider: 'FMP', dataSource: ['FMP'] },
  { id: 'share-statistics', name: 'Share Statistics', category: 'Equity', provider: 'Multi', dataSource: ['Yahoo', 'FMP'] },
  { id: 'valuation-multiples', name: 'Valuation Multiples', category: 'Equity', provider: 'FMP', dataSource: ['FMP'] },
  { id: 'revenue-geography', name: 'Revenue Per Geography', category: 'Equity', provider: 'FMP', dataSource: ['FMP'] },
  { id: 'revenue-business', name: 'Revenue Per Business Line', category: 'Equity', provider: 'FMP', dataSource: ['FMP'] },
  
  // Equity - Financial Statements
  { id: 'income-statement', name: 'Income Statement', category: 'Financial Statements', provider: 'FMP', dataSource: ['FMP'] },
  { id: 'balance-sheet', name: 'Balance Sheet', category: 'Financial Statements', provider: 'FMP', dataSource: ['FMP'] },
  { id: 'cash-flow-statement', name: 'Cash Flow Statement', category: 'Financial Statements', provider: 'FMP', dataSource: ['FMP'] },
  
  // Technical Analysis
  { id: 'moving-averages', name: 'Moving Averages (SMA/EMA)', category: 'Technical Analysis', provider: 'Alpha Vantage', dataSource: ['Alpha Vantage'] },
  { id: 'rsi', name: 'RSI (Relative Strength Index)', category: 'Technical Analysis', provider: 'Alpha Vantage', dataSource: ['Alpha Vantage'] },
  { id: 'macd', name: 'MACD', category: 'Technical Analysis', provider: 'Alpha Vantage', dataSource: ['Alpha Vantage'] },
  { id: 'bollinger-bands', name: 'Bollinger Bands', category: 'Technical Analysis', provider: 'Alpha Vantage', dataSource: ['Alpha Vantage'] },
  { id: 'stochastic', name: 'Stochastic Oscillator', category: 'Technical Analysis', provider: 'Alpha Vantage', dataSource: ['Alpha Vantage'] },
  
  // Options & Derivatives
  { id: 'options-flow', name: 'Options Flow', category: 'Options', provider: 'Multi', dataSource: ['Polygon', 'Benzinga'] },
  { id: 'options-chain', name: 'Options Chain', category: 'Options', provider: 'Polygon', dataSource: ['Polygon'] },
  { id: 'unusual-options', name: 'Unusual Options Activity', category: 'Options', provider: 'Multi', dataSource: ['Polygon', 'Benzinga'] },
  
  // News & Sentiment
  { id: 'company-news', name: 'Company News', category: 'News', provider: 'Multi', dataSource: ['Benzinga', 'Polygon', 'Yahoo'] },
  { id: 'market-news', name: 'Market News', category: 'News', provider: 'Benzinga', dataSource: ['Benzinga'] },
  
  // Analyst Research
  { id: 'price-target', name: 'Price Target', category: 'Analyst Research', provider: 'Multi', dataSource: ['FMP', 'Yahoo'] },
  { id: 'analyst-ratings', name: 'Analyst Ratings', category: 'Analyst Research', provider: 'Multi', dataSource: ['FMP', 'Benzinga'] },
  
  // Ownership
  { id: 'institutional-ownership', name: 'Institutional Ownership', category: 'Ownership', provider: 'Yahoo', dataSource: ['Yahoo'] },
  { id: 'insider-trading', name: 'Insider Trading', category: 'Ownership', provider: 'Yahoo', dataSource: ['Yahoo'] },
  
  // Market Overview
  { id: 'market-overview', name: 'Market Overview', category: 'Market Data', provider: 'Multi', dataSource: ['Yahoo', 'FMP'], description: 'Major indices and market movers' },
  
  // Real-time Data
  { id: 'real-time-quotes', name: 'Real-Time Quotes', category: 'Market Data', provider: 'Multi', dataSource: ['Alpha Vantage', 'Polygon', 'Yahoo'] },
  { id: 'last-trade', name: 'Last Trade Info', category: 'Market Data', provider: 'Polygon', dataSource: ['Polygon'] },
];

const WidgetSelectionDialog: React.FC<WidgetSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelectWidgets,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'widgets' | 'apps' | 'datasources'>('widgets');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'Equity': true,
    'Financial Statements': true,
    'Technical Analysis': true,
    'Options': true,
    'News': true,
    'Analyst Research': true,
    'Ownership': true,
    'Market Data': true,
  });
  const [myWidgetsChecked, setMyWidgetsChecked] = useState(false);
  const [sharedWithMeChecked, setSharedWithMeChecked] = useState(false);

  if (!isOpen) return null;

  const categories = [
    'All',
    'Equity',
    'Financial Statements',
    'Technical Analysis',
    'Options',
    'News',
    'Analyst Research',
    'Ownership',
    'Market Data'
  ];
  
  const filteredWidgets = widgetOptions.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         widget.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         widget.dataSource?.some(ds => ds.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || widget.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedWidgets = filteredWidgets.reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, WidgetOption[]>);

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets(prev =>
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleAddWidgets = () => {
    onSelectWidgets(selectedWidgets);
    setSelectedWidgets([]);
    setSearchTerm('');
    onClose();
  };

  const widgetCount = widgetOptions.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50" data-testid="widget-selection-dialog">
      <div className="bg-[#0f0f0f] rounded-lg w-[1200px] h-[700px] flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-medium text-white">Search</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for widgets, apps or prompt copilot"
              className="w-full pl-12 pr-12 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
            <Grid className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer" size={18} />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-4">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('widgets')}
              className={classNames(
                'pb-2 text-sm font-medium relative',
                activeTab === 'widgets'
                  ? 'text-[#00D9FF]'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              Widgets
              <span className="ml-2 px-2 py-0.5 bg-[#00D9FF] text-black text-xs rounded-full">
                {widgetCount}
              </span>
              {activeTab === 'widgets' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D9FF]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('apps')}
              className={classNames(
                'pb-2 text-sm font-medium relative',
                activeTab === 'apps'
                  ? 'text-[#00D9FF]'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              Apps
              <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                9
              </span>
              {activeTab === 'apps' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D9FF]"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('datasources')}
              className={classNames(
                'pb-2 text-sm font-medium relative',
                activeTab === 'datasources'
                  ? 'text-[#00D9FF]'
                  : 'text-gray-400 hover:text-gray-300'
              )}
            >
              Data Sources
              <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-400 text-xs rounded-full">
                11
              </span>
              {activeTab === 'datasources' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00D9FF]"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Only show for widgets tab */}
          {activeTab === 'widgets' && (
          <div className="w-64 border-r border-gray-800 px-6 py-4 overflow-y-auto">
            {/* Filters */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">FILTER</h3>
              <div className="space-y-2">
                <label className="flex items-center text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={myWidgetsChecked}
                    onChange={(e) => setMyWidgetsChecked(e.target.checked)}
                    className="mr-3 rounded border-gray-600 bg-transparent"
                  />
                  My Widgets
                </label>
                <label className="flex items-center text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sharedWithMeChecked}
                    onChange={(e) => setSharedWithMeChecked(e.target.checked)}
                    className="mr-3 rounded border-gray-600 bg-transparent"
                  />
                  Shared with me
                </label>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">CATEGORY</h3>
              <div className="space-y-1">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={classNames(
                      'w-full text-left px-3 py-2 text-sm rounded transition-colors',
                      selectedCategory === category
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Widget List */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'widgets' && (
              <div className="px-6 py-4">
                {selectedCategory === 'All' ? (
                  // Show grouped view for "All" category
                  Object.entries(groupedWidgets).map(([category, widgets]) => (
                    <div key={category} className="mb-4">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="flex items-center gap-2 text-sm text-gray-400 mb-3 hover:text-gray-300"
                      >
                        {expandedCategories[category] ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                        {category}
                      </button>
                      {expandedCategories[category] && (
                        <div className="space-y-1">
                          {widgets.map(widget => (
                            <div
                              key={widget.id}
                              className="flex items-center justify-between px-4 py-3 hover:bg-gray-900 rounded cursor-pointer"
                              onClick={() => toggleWidget(widget.id)}
                              data-testid={`widget-option-${widget.id}`}
                            >
                              <div className="flex-1">
                                <div className="text-sm text-white">{widget.name}</div>
                                {widget.description && (
                                  <div className="text-xs text-gray-500 mt-1">{widget.description}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                {widget.provider && (
                                  <span className="text-xs text-gray-500">{widget.provider}</span>
                                )}
                                <input
                                  type="checkbox"
                                  checked={selectedWidgets.includes(widget.id)}
                                  onChange={() => {}}
                                  className="rounded border-gray-600 bg-transparent"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  // Show flat list for specific category
                  <div>
                    <h3 className="text-sm font-medium text-white mb-4">Recently Added</h3>
                    <div className="space-y-1">
                      {filteredWidgets.map(widget => (
                        <div
                          key={widget.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-gray-900 rounded cursor-pointer"
                          onClick={() => toggleWidget(widget.id)}
                          data-testid={`widget-option-${widget.id}`}
                        >
                          <div className="flex-1">
                            <div className="text-sm text-white">{widget.name}</div>
                            {widget.description && (
                              <div className="text-xs text-gray-500 mt-1">{widget.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            {widget.provider && (
                              <span className="text-xs text-gray-500">{widget.provider}</span>
                            )}
                            <input
                              type="checkbox"
                              checked={selectedWidgets.includes(widget.id)}
                              onChange={() => {}}
                              className="rounded border-gray-600 bg-transparent"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'apps' && (
              <div className="px-6 py-4 text-gray-400 text-center">
                Apps coming soon...
              </div>
            )}
            {activeTab === 'datasources' && (
              <div className="px-6 py-4 h-full">
                <DataSourcesTable />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddWidgets}
            disabled={selectedWidgets.length === 0}
            className={classNames(
              'px-6 py-2 text-sm font-medium rounded transition-colors',
              selectedWidgets.length > 0
                ? 'bg-[#00D9FF] text-black hover:bg-[#00B8E0]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            )}
            data-testid="add-selected-widgets-button"
          >
            Add Widgets
          </button>
        </div>
      </div>
    </div>
  );
};

export default WidgetSelectionDialog;