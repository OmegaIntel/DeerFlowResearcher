import React from 'react';
import { MessageSquare, Settings, RefreshCw } from 'lucide-react';
import classNames from 'classnames';
import ResizableGridLayout from './ResizableGridLayout';
import ComparisonAnalysis from '../comparison/ComparisonAnalysis';
import OwnershipPage from '../ownership/OwnershipPage';
import TickerSelector from '../common/TickerSelector';
import { useWidgets } from '../../contexts/WidgetContext';
import { useDashboards } from '../../contexts/DashboardContext';

interface MainContentProps {
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
  onToggleCopilot: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenPageSettings?: () => void;
}

const MainContent: React.FC<MainContentProps> = ({ 
  selectedTicker, 
  onTickerChange,
  onToggleCopilot,
  activeTab,
  onTabChange,
  onOpenPageSettings 
}) => {
  const { widgets, pages, removeWidget } = useWidgets();
  const { activeDashboardId } = useDashboards();
  
  // Get widgets for current page and active dashboard
  const pageWidgets = widgets.filter(w => 
    w.pageId === activeTab && w.dashboardId === activeDashboardId
  );
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header with Tabs */}
      <header className="bg-openbb-bg-secondary border-b border-openbb-border flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TickerSelector 
              selectedTicker={selectedTicker}
              onTickerChange={onTickerChange}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="p-2 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
              title="Refresh All"
              data-testid="global-refresh-button"
            >
              <RefreshCw size={16} />
            </button>
            
            <button
              onClick={onToggleCopilot}
              className="flex items-center gap-2 px-3 py-1.5 bg-openbb-blue text-white rounded text-sm hover:bg-blue-600 transition-colors"
            >
              <MessageSquare size={16} />
              <span>OpenBB Copilot</span>
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center space-x-6">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => onTabChange(page.id)}
                className={classNames(
                  'py-3 px-1 text-sm font-medium border-b-2 transition-colors',
                  activeTab === page.id
                    ? 'text-openbb-accent border-openbb-accent'
                    : 'text-openbb-text-secondary border-transparent hover:text-openbb-text-primary'
                )}
              >
                {page.label}
              </button>
            ))}
          </div>
          
          {onOpenPageSettings && (
            <button
              onClick={onOpenPageSettings}
              className="p-2 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
              title="Customize Pages"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto bg-openbb-bg-primary w-full min-w-0" style={{ height: 'calc(100vh - 120px)' }}>
        {activeTab === 'overview' && (
          <ResizableGridLayout
            widgets={pageWidgets}
            selectedTicker={selectedTicker}
            onTickerChange={onTickerChange}
            onRemoveWidget={removeWidget}
          />
        )}
        
        {activeTab === 'financials' && (
          pageWidgets.length > 0 ? (
            <ResizableGridLayout
              widgets={pageWidgets}
              selectedTicker={selectedTicker}
              onTickerChange={onTickerChange}
              onRemoveWidget={removeWidget}
            />
          ) : (
            <div className="p-4">
              <div className="bg-openbb-bg-widget rounded border border-openbb-border p-8 text-center">
                <p className="text-openbb-text-muted font-mono text-sm mb-4">
                  No widgets added to this page yet.
                </p>
                <p className="text-openbb-text-muted font-mono text-xs">
                  Click the + button to add widgets.
                </p>
              </div>
            </div>
          )
        )}
        
        {activeTab === 'comparison' && (
          <ComparisonAnalysis ticker={selectedTicker} />
        )}
        
        {activeTab === 'ownership' && (
          <OwnershipPage ticker={selectedTicker} />
        )}
        
        {activeTab !== 'overview' && activeTab !== 'financials' && activeTab !== 'comparison' && activeTab !== 'ownership' && (
          pageWidgets.length > 0 ? (
            <ResizableGridLayout
              widgets={pageWidgets}
              selectedTicker={selectedTicker}
              onTickerChange={onTickerChange}
              onRemoveWidget={removeWidget}
            />
          ) : (
            <div className="p-4">
              <div className="bg-openbb-bg-widget rounded border border-openbb-border p-8 text-center">
                <p className="text-openbb-text-muted font-mono text-sm mb-4">
                  No widgets added to this page yet.
                </p>
                <p className="text-openbb-text-muted font-mono text-xs">
                  Click the + button to add widgets.
                </p>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default MainContent;