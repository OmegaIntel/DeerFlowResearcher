import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import MainContent from './MainContent';
import CopilotEnhanced from '../copilot/CopilotEnhanced';
import FloatingCopilotButton from '../common/FloatingCopilotButton';
import WidgetSelectionDialog from '../common/WidgetSelectionDialog';
import PageCustomizationDialog from '../common/PageCustomizationDialog';
import { useWidgets } from '../../contexts/WidgetContext';
import { useDashboards } from '../../contexts/DashboardContext';
import { useCopilot } from '../../contexts/CopilotContext';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [activeTab, setActiveTab] = useState('overview');
  const [isWidgetDialogOpen, setIsWidgetDialogOpen] = useState(false);
  const [isPageDialogOpen, setIsPageDialogOpen] = useState(false);
  
  const { pages, addWidgets, updatePages } = useWidgets();
  const { dashboards, activeDashboardId, updateDashboardTicker } = useDashboards();
  const { openCopilot, isOpen: isCopilotOpen } = useCopilot();
  
  // Update ticker when dashboard changes
  useEffect(() => {
    const activeDashboard = dashboards.find(d => d.id === activeDashboardId);
    if (activeDashboard) {
      setSelectedTicker(activeDashboard.ticker);
    }
  }, [activeDashboardId, dashboards]);

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#000000', maxWidth: 'none' }} data-testid="dashboard-container">
      {/* Sidebar */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        selectedTicker={selectedTicker}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full min-w-0" style={{ maxWidth: 'none' }}>
        <MainContent 
          selectedTicker={selectedTicker}
          onTickerChange={(ticker) => {
            setSelectedTicker(ticker);
            // Update the active dashboard's ticker
            if (activeDashboardId) {
              updateDashboardTicker(activeDashboardId, ticker);
            }
          }}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onOpenPageSettings={() => setIsPageDialogOpen(true)}
          onAddWidget={() => setIsWidgetDialogOpen(true)}
        />
      </div>

      {/* Copilot */}
      <CopilotEnhanced selectedTicker={selectedTicker} />
      
      {/* Floating Copilot Button - Bottom Right */}
      {!isCopilotOpen && <FloatingCopilotButton onClick={() => openCopilot()} />}
      
      {/* Widget Selection Dialog */}
      <WidgetSelectionDialog
        isOpen={isWidgetDialogOpen}
        onClose={() => setIsWidgetDialogOpen(false)}
        onSelectWidgets={(widgets) => addWidgets(widgets, activeTab, activeDashboardId)}
      />
      
      {/* Page Customization Dialog */}
      <PageCustomizationDialog
        isOpen={isPageDialogOpen}
        onClose={() => setIsPageDialogOpen(false)}
        pages={pages}
        onUpdatePages={updatePages}
      />
    </div>
  );
};

export default Layout;