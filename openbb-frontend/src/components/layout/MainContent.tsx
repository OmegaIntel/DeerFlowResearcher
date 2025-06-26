import React from 'react';
import { Edit2, Plus, Sun, Moon } from 'lucide-react';
import classNames from 'classnames';
import ResizableGridLayout from './ResizableGridLayout';
import ComparisonAnalysis from '../comparison/ComparisonAnalysis';
import OwnershipPage from '../ownership/OwnershipPage';
import TemplatesPage from '../templates/TemplatesPage';
import MindsDBPage from '../mindsdb/MindsDBPage';
import PrivateCompaniesPage from '../private-companies/PrivateCompaniesPage';
import DealroomPage from '../dealroom/DealroomPage';
import { useWidgets } from '../../contexts/WidgetContext';
import { useDashboards } from '../../contexts/DashboardContext';
import { useTheme } from '../../contexts/ThemeContext';

interface MainContentProps {
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenPageSettings?: () => void;
  onAddWidget?: () => void;
}

const MainContent: React.FC<MainContentProps> = ({ 
  selectedTicker, 
  onTickerChange,
  activeTab,
  onTabChange,
  onOpenPageSettings,
  onAddWidget 
}) => {
  const { widgets, pages, removeWidget } = useWidgets();
  const { activeDashboardId } = useDashboards();
  const { theme, toggleTheme } = useTheme();
  
  // Get widgets for current page and active dashboard
  const pageWidgets = widgets.filter(w => 
    w.pageId === activeTab && w.dashboardId === activeDashboardId
  );
  
  // Debug logging
  console.log('MainContent Debug:', {
    activeTab,
    activeDashboardId,
    totalWidgets: widgets.length,
    pageWidgets: pageWidgets.length,
    widgets: widgets.slice(0, 3) // Show first 3 widgets
  });
  
  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header with Tabs */}
      <header className="bg-openbb-bg-secondary border-b border-openbb-border flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-end">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
              data-testid="theme-toggle-button"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
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
          
          <div className="flex items-center gap-1">
            {onAddWidget && (
              <button
                onClick={onAddWidget}
                className="p-2 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Add Widget"
                data-testid="add-widget-button"
              >
                <Plus size={16} />
              </button>
            )}
            {onOpenPageSettings && (
              <button
                onClick={onOpenPageSettings}
                className="p-2 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Customize Pages"
              >
                <Edit2 size={16} />
              </button>
            )}
          </div>
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
                <p className="text-openbb-text-muted  text-sm mb-4">
                  No widgets added to this page yet.
                </p>
                <p className="text-openbb-text-muted  text-xs">
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
        
        {activeTab === 'templates' && (
          <TemplatesPage />
        )}
        
        {activeTab === 'mindsdb' && (
          <MindsDBPage />
        )}
        
        {activeTab === 'private-companies' && (
          <PrivateCompaniesPage />
        )}
        
        {activeTab === 'dealroom' && (
          <DealroomPage />
        )}
        
        {activeTab !== 'overview' && activeTab !== 'financials' && activeTab !== 'comparison' && activeTab !== 'ownership' && activeTab !== 'templates' && activeTab !== 'mindsdb' && activeTab !== 'private-companies' && activeTab !== 'dealroom' && (
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
                <p className="text-openbb-text-muted  text-sm mb-4">
                  No widgets added to this page yet.
                </p>
                <p className="text-openbb-text-muted  text-xs">
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