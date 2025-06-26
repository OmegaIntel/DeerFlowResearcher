import React, { useState, useEffect } from 'react';
import { 
  Plus,
  FileText,
  Settings,
  Trash2,
  MoreVertical,
  GripVertical,
  Command,
  Home,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Building2,
  GitBranch,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import classNames from 'classnames';
import { useDashboards } from '../../contexts/DashboardContext';
import NewDashboardDialog from '../common/NewDashboardDialog';
import OmegaMainLogo from '../icons/OmegaMainLogo';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedTicker?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const [isNewDashboardOpen, setIsNewDashboardOpen] = useState(false);
  const [showDashboardMenu, setShowDashboardMenu] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [width, setWidth] = useState(isOpen ? 256 : 64);
  const [isResizing, setIsResizing] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  
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

  const handleRefresh = () => {
    window.location.reload();
  };

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= 180 && newWidth <= 400) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Update width when sidebar is toggled
  useEffect(() => {
    if (isOpen && width < 180) {
      setWidth(256);
    } else if (!isOpen) {
      setWidth(64);
    }
  }, [isOpen]);

  // Navigation items
  const navigationItems = [
    { icon: Home, label: 'Dashboard', path: '/', active: true },
    { icon: TrendingUp, label: 'Markets', path: '/markets' },
    { icon: BarChart3, label: 'Analytics', path: '/analytics' },
    { icon: FileSpreadsheet, label: 'Reports', path: '/reports' },
    { icon: Building2, label: 'Companies', path: '/companies' },
    { icon: GitBranch, label: 'Strategies', path: '/strategies' },
  ];

  return (
    <>
      <div 
        className="bg-openbb-bg-secondary text-openbb-text-primary flex flex-col border-r border-openbb-border relative h-full"
        style={{ width: `${width}px`, transition: isResizing ? 'none' : 'width 0.3s' }}
      >
        {/* Omega Terminal Header */}
        <div className="p-4 border-b border-openbb-border">
          <div className="flex items-center justify-between">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              title="Refresh Dashboard"
            >
              <OmegaMainLogo size={isOpen ? 32 : 24} />
              {isOpen && (
                <div>
                  <h1 className="text-base font-semibold text-white">Omega Terminal</h1>
                </div>
              )}
            </button>
            
            {isOpen && (
              <button
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                className="p-2 hover:bg-openbb-bg-hover rounded transition-colors relative"
                title="Workspace Menu"
              >
                <Command size={16} className="text-openbb-text-muted" />
              </button>
            )}
          </div>
          
          {/* Workspace Dropdown Menu */}
          {showWorkspaceMenu && isOpen && (
            <div className="absolute right-4 top-16 bg-openbb-bg-widget border border-openbb-border rounded-lg shadow-lg z-50 w-48">
              <div className="p-2">
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-openbb-bg-hover rounded transition-colors">
                  New Workspace
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-openbb-bg-hover rounded transition-colors">
                  Switch Workspace
                </button>
                <div className="border-t border-openbb-border my-2"></div>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-openbb-bg-hover rounded transition-colors">
                  Workspace Settings
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search Bar */}
        {isOpen && (
          <div className="p-4 border-b border-openbb-border">
            <div className="relative">
              <Command size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-openbb-text-muted" />
              <input
                type="text"
                placeholder="Search or type command..."
                className="w-full pl-8 pr-3 py-2 bg-openbb-bg-widget border border-openbb-border rounded-lg text-sm text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          {/* Main Navigation */}
          <div className="p-2">
            {navigationItems.map((item) => (
              <button
                key={item.label}
                className={classNames(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm mb-1',
                  item.active
                    ? 'bg-openbb-accent bg-opacity-10 text-openbb-accent'
                    : 'text-openbb-text-secondary hover:bg-openbb-bg-hover hover:text-openbb-text-primary'
                )}
              >
                <item.icon size={18} />
                {isOpen && <span>{item.label}</span>}
              </button>
            ))}
          </div>

          {/* Dashboards Section */}
          <div className="px-4 pt-4 pb-2">
            {isOpen && (
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-openbb-text-muted uppercase tracking-wider">
                  My Dashboards
                </h3>
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
            <div className="space-y-1">
              {userDashboards.map((dashboard) => (
                <div
                  key={dashboard.id}
                  className="relative group"
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveDashboard(dashboard.id)}
                      className={classNames(
                        'flex-1 flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm text-left',
                        activeDashboardId === dashboard.id 
                          ? 'bg-openbb-accent bg-opacity-10 text-openbb-accent' 
                          : 'hover:bg-openbb-bg-hover text-openbb-text-secondary'
                      )}
                    >
                      <FileText size={14} />
                      {isOpen && <span className="truncate">{dashboard.name}</span>}
                    </button>
                    
                    {isOpen && userDashboards.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDashboardMenu(showDashboardMenu === dashboard.id ? null : dashboard.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-openbb-bg-hover rounded"
                      >
                        <MoreVertical size={14} />
                      </button>
                    )}
                  </div>
                  
                  {/* Dashboard Menu */}
                  {showDashboardMenu === dashboard.id && (
                    <div className="absolute right-0 top-full mt-1 bg-openbb-bg-widget border border-openbb-border rounded-lg shadow-lg z-10">
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

            {/* Templates */}
            {isOpen && templates.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-openbb-text-muted uppercase tracking-wider mb-3">
                  Templates
                </h3>
                <div className="space-y-1">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplateId(template.id);
                        setIsNewDashboardOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm hover:bg-openbb-bg-hover text-openbb-text-secondary"
                    >
                      <FileText size={14} />
                      <span className="truncate">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-openbb-border">
          {/* Bottom Actions */}
          <div className="p-4 flex items-center justify-end">
            <button className="p-2 hover:bg-openbb-bg-hover rounded-lg transition-colors">
              <Settings size={18} className="text-openbb-text-muted" />
            </button>
          </div>
          
          {isOpen && (
            <div className="px-4 pb-3">
              <p className="text-xs text-openbb-text-muted text-center">Version 2.0.2</p>
            </div>
          )}
        </div>

        {/* Resize Handle */}
        {isOpen && (
          <div
            className="absolute right-0 top-0 h-full w-2 bg-transparent hover:bg-gray-700/50 cursor-col-resize transition-colors group"
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="absolute right-0 top-0 h-full w-0.5 bg-gray-700"></div>
            <div className="absolute right-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical size={16} className="text-gray-400" />
            </div>
          </div>
        )}
        
        {/* Collapse Button */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 bg-openbb-bg-widget border border-openbb-border rounded-full p-1 hover:bg-openbb-bg-hover transition-all duration-200 shadow-sm hover:shadow-md z-50"
          title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <ChevronLeft size={14} className="text-openbb-text-muted" />
          ) : (
            <ChevronRight size={14} className="text-openbb-text-muted" />
          )}
        </button>
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