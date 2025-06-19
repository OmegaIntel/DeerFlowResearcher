import React from 'react';
import { RefreshCw, Plus, Maximize2, MoreHorizontal, ChevronDown } from 'lucide-react';

interface WidgetHeaderProps {
  title: string;
  ticker?: string;
  showTickerDropdown?: boolean;
  onRefresh?: () => void;
  onAdd?: () => void;
  onExpand?: () => void;
  onMore?: () => void;
  onTickerClick?: () => void;
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
}) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-openbb-text-primary font-mono">
          {title}
        </h3>
        {ticker && showTickerDropdown && (
          <button
            onClick={onTickerClick}
            className="flex items-center gap-1 px-2 py-0.5 bg-openbb-accent text-openbb-bg-primary rounded text-xs font-mono hover:bg-openbb-accent-hover transition-colors"
          >
            {ticker}
            <ChevronDown size={12} />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
        )}
        {onAdd && (
          <button
            onClick={onAdd}
            className="p-1 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
            title="Add to dashboard"
          >
            <Plus size={14} />
          </button>
        )}
        {onExpand && (
          <button
            onClick={onExpand}
            className="p-1 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
            title="Expand"
          >
            <Maximize2 size={14} />
          </button>
        )}
        {onMore && (
          <button
            onClick={onMore}
            className="p-1 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
            title="More options"
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WidgetHeader;