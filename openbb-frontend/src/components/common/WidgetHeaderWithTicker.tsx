import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Plus, Maximize2, MoreHorizontal, ChevronDown, X, Settings, Download } from 'lucide-react';
import { TICKER_OPTIONS } from '../../constants/tickers';

interface WidgetHeaderWithTickerProps {
  title: string;
  ticker: string;
  onTickerChange: (ticker: string) => void;
  onRefresh?: () => void;
  onAdd?: () => void;
  onExpand?: () => void;
  onMore?: () => void;
  onSettings?: () => void;
  onRemove?: () => void;
  onDownload?: () => void;
}

const WidgetHeaderWithTicker: React.FC<WidgetHeaderWithTickerProps> = ({
  title,
  ticker,
  onTickerChange,
  onRefresh,
  onAdd,
  onExpand,
  onMore,
  onSettings,
  onRemove,
  onDownload,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div className="widget-drag-handle flex items-center justify-between mb-4 cursor-move select-none">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-openbb-text-primary ">
          {title}
        </h3>
        
        {/* Ticker Dropdown */}
        <div ref={dropdownRef} className="relative widget-no-drag" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="flex items-center gap-1 px-2 py-0.5 bg-openbb-accent text-openbb-bg-primary rounded text-xs  hover:bg-openbb-accent-hover transition-colors cursor-pointer"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {ticker}
            <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-openbb-bg-widget border border-openbb-border rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                {TICKER_OPTIONS.map((option) => (
                  <button
                    key={option.symbol}
                    onClick={() => {
                      onTickerChange(option.symbol);
                      setIsOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left hover:bg-openbb-bg-hover transition-colors duration-200  text-xs border-b border-openbb-border last:border-b-0 ${
                      option.symbol === ticker ? 'bg-openbb-bg-hover' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-openbb-text-primary font-semibold">{option.symbol}</span>
                        <span className="text-openbb-text-muted ml-2 text-xs">{option.name}</span>
                      </div>
                      {option.symbol === ticker && (
                        <span className="text-openbb-accent text-xs">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-0 widget-no-drag" onClick={(e) => e.stopPropagation()}>
        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-all duration-200 cursor-pointer"
            title="Add widget data to Copilot"
          >
            <Plus size={14} />
          </button>
        )}
        {onDownload && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-all duration-200 cursor-pointer"
            title="Download CSV"
          >
            <Download size={14} />
          </button>
        )}
        {onSettings && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSettings();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-all duration-200 cursor-pointer"
            title="Widget Settings"
          >
            <Settings size={14} />
          </button>
        )}
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-all duration-200 cursor-pointer"
            title="Remove Widget"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default WidgetHeaderWithTicker;