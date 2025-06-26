import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { TICKER_OPTIONS } from '../../constants/tickers';

interface TickerSelectorProps {
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
  className?: string;
}

const TickerSelector: React.FC<TickerSelectorProps> = ({ 
  selectedTicker, 
  onTickerChange,
  className = ''
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

  const selectedTickerData = TICKER_OPTIONS.find(t => t.symbol === selectedTicker) || TICKER_OPTIONS[0];

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-openbb-bg-widget border border-openbb-border rounded-lg hover:bg-openbb-bg-hover transition-colors duration-200  text-sm"
        data-testid="ticker-input"
      >
        <div className="flex flex-col items-start">
          <span className="text-openbb-text-primary font-semibold">{selectedTickerData.symbol}</span>
          <span className="text-xs text-openbb-text-muted">{selectedTickerData.name}</span>
        </div>
        <ChevronDown 
          size={16} 
          className={`text-openbb-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-openbb-bg-widget border border-openbb-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {TICKER_OPTIONS.map((ticker) => (
              <button
                key={ticker.symbol}
                onClick={() => {
                  onTickerChange(ticker.symbol);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-openbb-bg-hover transition-colors duration-200  text-sm border-b border-openbb-border last:border-b-0 ${
                  ticker.symbol === selectedTicker ? 'bg-openbb-bg-hover' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-openbb-text-primary font-semibold">{ticker.symbol}</span>
                    <span className="text-xs text-openbb-text-muted ml-2">{ticker.name}</span>
                  </div>
                  {ticker.symbol === selectedTicker && (
                    <span className="text-openbb-accent">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TickerSelector;