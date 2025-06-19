import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  FileText,
  Settings,
  Trash2,
  MoreVertical
} from 'lucide-react';
import classNames from 'classnames';
import { useDashboards } from '../../contexts/DashboardContext';
import NewDashboardDialog from '../common/NewDashboardDialog';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedTicker?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const [isNewDashboardOpen, setIsNewDashboardOpen] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  const { 
    dashboards, 
    activeDashboardId, 
    createDashboard, 
    deleteDashboard, 
    setActiveDashboard,
    createFromTemplate 
  } = useDashboards();

  const userDashboards = dashboards.filter(d => !d.isTemplate);
  const templates = dashboards.filter(d => d.isTemplate);

  const handleDeleteDashboard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (userDashboards.length > 1) {
      deleteDashboard(id);
    }
    setShowDashboardMenu(null);
  };

  return (
    <>
      <div className={classNames(
        'bg-openbb-bg-secondary text-openbb-text-primary transition-all duration-300 flex flex-col border-r border-openbb-border',
        isOpen ? 'w-64' : 'w-16'
      )}>
        {/* Collapse/Expand Button */}
        <div className="p-4 border-b border-openbb-border">
          <button
            onClick={onToggle}
            className="p-2 hover:bg-openbb-bg-hover rounded transition-colors w-full flex justify-center"
          >
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Main Content */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {/* Search */}
          {isOpen && (
            <div className="mb-4">
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full px-3 py-1.5 bg-openbb-bg-widget border border-openbb-border rounded text-sm text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent font-mono"
                />
              </div>
            </div>
          )}
          
          {/* Dashboards Section */}
          {isOpen && (
            <div className="mb-2 px-3 flex items-center justify-between">
              <p className="text-xs text-openbb-text-muted uppercase tracking-wider">Dashboards</p>
              <button
                onClick={() => setIsNewDashboardOpen(true)}
                className="p-1 hover:bg-openbb-bg-hover rounded transition-colors"
                title="Create New Dashboard"
              >
                <Plus size={14} className="text-openbb-text-muted hover:text-openbb-text-primary" />
              </button>
            </div>
          )}
          
          {/* Dashboard List */}
          <div className="space-y-1 mb-6">
            {userDashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                className="relative group"
              >
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveDashboard(dashboard.id)}
                    className={classNames(
                      'flex-1 flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm text-left',
                      activeDashboardId === dashboard.id 
                        ? 'bg-openbb-accent text-openbb-bg-primary' 
                        : 'hover:bg-openbb-bg-hover text-openbb-text-secondary'
                    )}
                  >
                    <span className="truncate font-mono">{dashboard.name}</span>
                  </button>
                  
                  {userDashboards.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDashboardMenu(showDashboardMenu === dashboard.id ? null : dashboard.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-black hover:bg-opacity-20 rounded"
                    >
                      <MoreVertical size={14} />
                    </button>
                  )}
                </div>
                
                {/* Dashboard Menu */}
                {showDashboardMenu === dashboard.id && (
                  <div className="absolute right-0 top-full mt-1 bg-openbb-bg-widget border border-openbb-border rounded shadow-lg z-10">
                    <button
                      onClick={(e) => handleDeleteDashboard(dashboard.id, e)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-openbb-danger hover:bg-openbb-bg-hover transition-colors whitespace-nowrap"
                    >
                      <Trash2 size={14} />
                      Delete Dashboard
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Templates Section */}
          {isOpen && templates.length > 0 && (
            <>
              <div className="mb-2 px-3">
                <p className="text-xs text-openbb-text-muted uppercase tracking-wider">Templates</p>
              </div>
              
              <div className="space-y-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplateId(template.id);
                      setIsNewDashboardOpen(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm hover:bg-openbb-bg-hover text-openbb-text-secondary"
                  >
                    <FileText size={16} />
                    <span className="truncate font-mono">{template.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-openbb-border">
          {isOpen && (
            <div className="mb-3 px-3">
              <p className="text-xs text-openbb-text-muted mb-2">Upgrade to Enterprise</p>
              <button className="w-full bg-openbb-blue hover:bg-blue-600 text-white py-2 px-3 rounded text-xs transition-colors font-mono">
                Book a Meeting
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between px-3 py-2">
            {isOpen && <span className="text-xs text-openbb-text-muted font-mono">v2.0.2</span>}
            <button className="p-2 hover:bg-openbb-bg-hover rounded transition-colors ml-auto">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* New Dashboard Dialog */}
      <NewDashboardDialog
        isOpen={isNewDashboardOpen}
        onClose={() => {
          setIsNewDashboardOpen(false);
          setSelectedTemplateId(null);
        }}
        onCreate={createDashboard}
        onCreateFromTemplate={createFromTemplate}
        templates={templates.map(t => ({
          id: t.id,
          name: t.name,
          description: 'Pre-configured dashboard with essential widgets for equity analysis'
        }))}
        initialTemplateId={selectedTemplateId}
      />
    </>
  );
};

export default Sidebar;