import React from 'react';
import { RefreshCw, Plus, Maximize2, MoreHorizontal, ChevronDown, X, Settings, Download } from 'lucide-react';

interface WidgetHeaderProps {
  title: string;
  ticker?: string;
  showTickerDropdown?: boolean;
  onRefresh?: () => void;
  onAdd?: () => void;
  onExpand?: () => void;
  onMore?: () => void;
  onTickerClick?: () => void;
  onSettings?: () => void;
  onRemove?: () => void;
  onDownload?: () => void;
}

const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  title,
  ticker,
  showTickerDropdown = false,
  onRefresh,
  onAdd,
  onExpand,
  onMore,
  onTickerClick,
  onSettings,
  onRemove,
  onDownload,
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-openbb-text-primary ">
          {title}
        </h3>
        {ticker && showTickerDropdown && (
          <button
            onClick={onTickerClick}
            className="flex items-center gap-1 px-2 py-0.5 bg-openbb-accent text-openbb-bg-primary rounded text-xs  hover:bg-openbb-accent-hover transition-colors"
          >
            {ticker}
            <ChevronDown size={12} />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-0">
        {onAdd && (
          <button
            onClick={onAdd}
            className="p-1.5 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-all duration-200"
            title="Add widget data to Copilot"
          >
            <Plus size={14} />
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="p-1.5 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-all duration-200"
            title="Download CSV"
          >
            <Download size={14} />
          </button>
        )}
        {onSettings && (
          <button
            onClick={onSettings}
            className="p-1.5 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-all duration-200"
            title="Widget Settings"
          >
            <Settings size={14} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-all duration-200"
            title="Remove Widget"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WidgetHeader;