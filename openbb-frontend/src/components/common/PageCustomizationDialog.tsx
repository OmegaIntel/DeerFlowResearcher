import React, { useState } from 'react';
import { X, Plus, Trash2, GripVertical, Settings } from 'lucide-react';
import classNames from 'classnames';

interface Page {
  id: string;
  label: string;
  isDefault?: boolean;
  isCustom?: boolean;
}

interface PageCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pages: Page[];
  onUpdatePages: (pages: Page[]) => void;
}

const PageCustomizationDialog: React.FC<PageCustomizationDialogProps> = ({
  isOpen,
  onClose,
  pages,
  onUpdatePages,
}) => {
  const [localPages, setLocalPages] = useState<Page[]>(pages);
  const [newPageName, setNewPageName] = useState('');
  const [isAddingPage, setIsAddingPage] = useState(false);

  if (!isOpen) return null;

  const handleAddPage = () => {
    if (newPageName.trim()) {
      const newPage: Page = {
        id: newPageName.toLowerCase().replace(/\s+/g, '-'),
        label: newPageName,
        isCustom: true,
      };
      setLocalPages([...localPages, newPage]);
      setNewPageName('');
      setIsAddingPage(false);
    }
  };

  const handleRemovePage = (pageId: string) => {
    setLocalPages(localPages.filter(page => page.id !== pageId));
  };

  const handleSave = () => {
    onUpdatePages(localPages);
    onClose();
  };

  const movePageUp = (index: number) => {
    if (index > 0) {
      const newPages = [...localPages];
      [newPages[index - 1], newPages[index]] = [newPages[index], newPages[index - 1]];
      setLocalPages(newPages);
    }
  };

  const movePageDown = (index: number) => {
    if (index < localPages.length - 1) {
      const newPages = [...localPages];
      [newPages[index], newPages[index + 1]] = [newPages[index + 1], newPages[index]];
      setLocalPages(newPages);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border w-[600px] max-h-[500px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-openbb-border">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-openbb-accent" />
            <h2 className="text-lg font-mono font-semibold text-openbb-text-primary">Customize Pages</h2>
          </div>
          <button
            onClick={onClose}
            className="text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {localPages.map((page, index) => (
              <div
                key={page.id}
                className="flex items-center gap-2 p-3 bg-openbb-bg-secondary rounded border border-openbb-border group"
              >
                <GripVertical size={16} className="text-openbb-text-muted cursor-move" />
                
                <div className="flex-1">
                  <span className="text-sm font-mono text-openbb-text-primary">{page.label}</span>
                  {page.isDefault && (
                    <span className="ml-2 text-xs font-mono text-openbb-text-muted">(Default)</span>
                  )}
                  {page.isCustom && (
                    <span className="ml-2 text-xs font-mono text-openbb-accent">(Custom)</span>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => movePageUp(index)}
                    disabled={index === 0}
                    className={classNames(
                      'p-1 rounded text-xs font-mono transition-colors',
                      index === 0
                        ? 'text-openbb-text-muted cursor-not-allowed'
                        : 'text-openbb-text-secondary hover:text-openbb-text-primary hover:bg-openbb-bg-hover'
                    )}
                    title="Move Up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => movePageDown(index)}
                    disabled={index === localPages.length - 1}
                    className={classNames(
                      'p-1 rounded text-xs font-mono transition-colors',
                      index === localPages.length - 1
                        ? 'text-openbb-text-muted cursor-not-allowed'
                        : 'text-openbb-text-secondary hover:text-openbb-text-primary hover:bg-openbb-bg-hover'
                    )}
                    title="Move Down"
                  >
                    ↓
                  </button>
                  {page.isCustom && (
                    <button
                      onClick={() => handleRemovePage(page.id)}
                      className="p-1 text-openbb-danger hover:bg-red-900 hover:bg-opacity-20 rounded transition-colors"
                      title="Remove Page"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Add New Page */}
            {isAddingPage ? (
              <div className="flex items-center gap-2 p-3 bg-openbb-bg-secondary rounded border border-openbb-accent">
                <input
                  type="text"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
                  placeholder="Page name..."
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-openbb-text-primary placeholder-openbb-text-muted"
                />
                <button
                  onClick={handleAddPage}
                  className="px-2 py-1 text-xs font-mono bg-openbb-accent text-openbb-bg-primary rounded hover:bg-openbb-accent-hover transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setIsAddingPage(false);
                    setNewPageName('');
                  }}
                  className="px-2 py-1 text-xs font-mono text-openbb-text-secondary hover:text-openbb-text-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingPage(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-openbb-border rounded text-openbb-text-muted hover:text-openbb-text-primary hover:border-openbb-accent transition-colors"
              >
                <Plus size={16} />
                <span className="text-sm font-mono">Add Custom Page</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-openbb-border">
          <div className="text-sm font-mono text-openbb-text-muted">
            {localPages.length} page{localPages.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-mono text-openbb-text-secondary hover:text-openbb-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-mono bg-openbb-accent text-openbb-bg-primary rounded hover:bg-openbb-accent-hover transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageCustomizationDialog;