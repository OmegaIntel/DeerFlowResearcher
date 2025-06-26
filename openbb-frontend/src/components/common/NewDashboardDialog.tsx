import React, { useState } from 'react';
import { X, FileText } from 'lucide-react';
import classNames from 'classnames';

interface NewDashboardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, ticker: string) => void;
  onCreateFromTemplate?: (templateId: string, name: string, ticker: string) => void;
  templates?: Array<{ id: string; name: string; description?: string }>;
  initialTemplateId?: string | null;
}

const NewDashboardDialog: React.FC<NewDashboardDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  onCreateFromTemplate,
  templates = [],
  initialTemplateId,
}) => {
  const [dashboardName, setDashboardName] = useState('');
  const [ticker, setTicker] = useState('AAPL');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(initialTemplateId || null);

  // Update selectedTemplate when initialTemplateId changes
  React.useEffect(() => {
    if (initialTemplateId) {
      setSelectedTemplate(initialTemplateId);
    }
  }, [initialTemplateId]);

  if (!isOpen) return null;

  const handleCreate = () => {
    if (dashboardName.trim() && ticker.trim()) {
      if (selectedTemplate && onCreateFromTemplate) {
        onCreateFromTemplate(selectedTemplate, dashboardName, ticker);
      } else {
        onCreate(dashboardName, ticker);
      }
      setDashboardName('');
      setTicker('AAPL');
      setSelectedTemplate(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border w-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-openbb-border">
          <h2 className="text-lg  font-semibold text-openbb-text-primary">Create New Dashboard</h2>
          <button
            onClick={onClose}
            className="text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Dashboard Name */}
          <div>
            <label htmlFor="dashboard-name" className="block text-sm  text-openbb-text-secondary mb-2">
              Dashboard Name
            </label>
            <input
              id="dashboard-name"
              type="text"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              placeholder="e.g., Tech Analysis Dashboard"
              className="w-full px-3 py-2 bg-openbb-bg-secondary border border-openbb-border rounded text-sm text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent "
              autoFocus
            />
          </div>

          {/* Default Ticker */}
          <div>
            <label htmlFor="ticker-symbol" className="block text-sm  text-openbb-text-secondary mb-2">
              Ticker Symbol
            </label>
            <input
              id="ticker-symbol"
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full px-3 py-2 bg-openbb-bg-secondary border border-openbb-border rounded text-sm text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent "
            />
          </div>

          {/* Templates */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm  text-openbb-text-secondary mb-2">
                Start from Template (Optional)
              </label>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(
                      selectedTemplate === template.id ? null : template.id
                    )}
                    className={classNames(
                      'w-full p-3 rounded border text-left transition-all',
                      selectedTemplate === template.id
                        ? 'border-openbb-accent bg-openbb-accent bg-opacity-10'
                        : 'border-openbb-border hover:border-openbb-accent hover:bg-openbb-bg-hover'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <FileText size={16} className="text-openbb-accent mt-0.5" />
                      <div>
                        <h4 className="text-sm  font-semibold text-openbb-text-primary">
                          {template.name}
                        </h4>
                        {template.description && (
                          <p className="text-xs  text-openbb-text-muted mt-1">
                            {template.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-openbb-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm  text-openbb-text-secondary hover:text-openbb-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!dashboardName.trim() || !ticker.trim()}
            className={classNames(
              'px-4 py-2 text-sm  rounded transition-colors',
              dashboardName.trim() && ticker.trim()
                ? 'bg-openbb-accent text-openbb-bg-primary hover:bg-openbb-accent-hover'
                : 'bg-openbb-bg-secondary text-openbb-text-muted cursor-not-allowed'
            )}
          >
            {selectedTemplate ? 'Create from Template' : 'Create Dashboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewDashboardDialog;