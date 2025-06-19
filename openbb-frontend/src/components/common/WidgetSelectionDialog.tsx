import React, { useState } from 'react';
import { X, Search, Check } from 'lucide-react';
import classNames from 'classnames';

interface WidgetOption {
  id: string;
  name: string;
  category: string;
  description?: string;
}

interface WidgetSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWidgets: (widgets: string[]) => void;
}

const widgetOptions: WidgetOption[] = [
  // Company Information
  { id: 'ticker-info', name: 'Ticker Information', category: 'Company Information' },
  { id: 'company-profile', name: 'Company Profile', category: 'Company Information' },
  { id: 'company-news', name: 'Company News', category: 'Company Information' },
  { id: 'management-team', name: 'Management Team', category: 'Company Information' },
  
  // Financial Metrics
  { id: 'price-performance', name: 'Price Performance', category: 'Financial Metrics' },
  { id: 'key-metrics', name: 'Key Metrics', category: 'Financial Metrics' },
  { id: 'share-statistics', name: 'Share Statistics', category: 'Financial Metrics' },
  { id: 'valuation-multiples', name: 'Valuation Multiples', category: 'Financial Metrics' },
  
  // Revenue Analysis
  { id: 'revenue-geography', name: 'Revenue Per Geography', category: 'Revenue Analysis' },
  { id: 'revenue-business', name: 'Revenue Per Business Line', category: 'Revenue Analysis' },
  
  // Technical Analysis
  { id: 'price-chart', name: 'Price Chart', category: 'Technical Analysis' },
  { id: 'volume-chart', name: 'Volume Chart', category: 'Technical Analysis' },
  { id: 'moving-averages', name: 'Moving Averages', category: 'Technical Analysis' },
  
  // Ownership
  { id: 'institutional-ownership', name: 'Institutional Ownership', category: 'Ownership' },
  { id: 'insider-trading', name: 'Insider Trading', category: 'Ownership' },
  
  // OpenBB Enhanced (New)
  { id: 'market-overview', name: 'Market Overview', category: 'Market Data', description: 'Major indices, crypto, and forex overview' },
  { id: 'options-flow', name: 'Options Flow', category: 'Derivatives', description: 'Options chain and unusual activity' },
  
  // Analyst & Regulatory
  { id: 'price-target', name: 'Price Target By Analyst', category: 'Analyst Research', description: 'Analyst ratings and price targets' },
  { id: 'company-filings', name: 'Company Filings', category: 'Regulatory', description: 'SEC filings including 10-K, 10-Q, 8-K' },
  { id: 'earnings-transcripts', name: 'Earnings Transcripts', category: 'Analyst Research', description: 'Full earnings call transcripts by quarter and year' },
];

const WidgetSelectionDialog: React.FC<WidgetSelectionDialogProps> = ({
  isOpen,
  onClose,
  onSelectWidgets,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = Array.from(new Set(widgetOptions.map(w => w.category)));
  
  const filteredWidgets = widgetOptions.filter(widget => {
    const matchesSearch = widget.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || widget.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets(prev =>
      prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const handleAddWidgets = () => {
    onSelectWidgets(selectedWidgets);
    setSelectedWidgets([]);
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="widget-selection-dialog">
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border w-[800px] max-h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-openbb-border">
          <h2 className="text-lg font-mono font-semibold text-openbb-text-primary">Add Widgets</h2>
          <button
            onClick={onClose}
            className="text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-openbb-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-openbb-text-muted" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search widgets..."
              className="w-full pl-10 pr-4 py-2 bg-openbb-bg-secondary border border-openbb-border rounded text-sm text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent font-mono"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-48 border-r border-openbb-border p-4">
            <h3 className="text-xs font-mono font-semibold text-openbb-text-secondary mb-2 uppercase">Categories</h3>
            <button
              onClick={() => setSelectedCategory(null)}
              className={classNames(
                'w-full text-left px-2 py-1 text-sm font-mono rounded mb-1 transition-colors',
                !selectedCategory
                  ? 'bg-openbb-accent text-openbb-bg-primary'
                  : 'text-openbb-text-secondary hover:bg-openbb-bg-hover'
              )}
            >
              All Categories
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={classNames(
                  'w-full text-left px-2 py-1 text-sm font-mono rounded mb-1 transition-colors',
                  selectedCategory === category
                    ? 'bg-openbb-accent text-openbb-bg-primary'
                    : 'text-openbb-text-secondary hover:bg-openbb-bg-hover'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Widget Grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              {filteredWidgets.map(widget => (
                <button
                  key={widget.id}
                  onClick={() => toggleWidget(widget.id)}
                  className={classNames(
                    'p-3 rounded border transition-all text-left',
                    selectedWidgets.includes(widget.id)
                      ? 'border-openbb-accent bg-openbb-accent bg-opacity-10'
                      : 'border-openbb-border hover:border-openbb-accent hover:bg-openbb-bg-hover'
                  )}
                  data-testid={`widget-option-${widget.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-mono font-semibold text-openbb-text-primary mb-1">
                        {widget.name}
                      </h4>
                      <p className="text-xs font-mono text-openbb-text-muted">
                        {widget.category}
                      </p>
                    </div>
                    {selectedWidgets.includes(widget.id) && (
                      <Check size={16} className="text-openbb-accent mt-1" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-openbb-border">
          <div className="text-sm font-mono text-openbb-text-muted">
            {selectedWidgets.length} widget{selectedWidgets.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-mono text-openbb-text-secondary hover:text-openbb-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddWidgets}
              disabled={selectedWidgets.length === 0}
              className={classNames(
                'px-4 py-2 text-sm font-mono rounded transition-colors',
                selectedWidgets.length > 0
                  ? 'bg-openbb-accent text-openbb-bg-primary hover:bg-openbb-accent-hover'
                  : 'bg-openbb-bg-secondary text-openbb-text-muted cursor-not-allowed'
              )}
              data-testid="add-selected-widgets-button"
            >
              Add {selectedWidgets.length} Widget{selectedWidgets.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WidgetSelectionDialog;