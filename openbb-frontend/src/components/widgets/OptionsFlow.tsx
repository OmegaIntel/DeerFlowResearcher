import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Filter, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';

interface OptionsFlowProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  dataProvider?: string;
  onSettings?: () => void;
  onRemove?: () => void;
}

interface OptionContract {
  contract_type: string;
  option_type?: string;
  strike: number;
  expiration: string;
  last_price?: number;
  price?: number;
  volume: number;
  open_interest: number;
  implied_volatility?: number;
  delta?: number;
  bid?: number;
  ask?: number;
  volume_ratio?: number;
  unusual_score?: number;
  sentiment?: string;
  description?: string;
  time?: string;
  underlying_price?: number;
  unusual_activity?: boolean;
}

const OptionsFlow: React.FC<OptionsFlowProps> = ({ ticker, onTickerChange, dataProvider = 'auto', onSettings, onRemove }) => {
  const [optionsData, setOptionsData] = useState<OptionContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'calls' | 'puts'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const { addWidgetContext } = useCopilot();

  const fetchOptionsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Determine endpoint based on provider
      const endpoint = dataProvider === 'benzinga' 
        ? `/api/v1/equity/options/activity?symbol=${ticker}&provider=${dataProvider}`
        : `/api/v1/equity/options/chain?symbol=${ticker}${dataProvider !== 'auto' ? `&provider=${dataProvider}` : ''}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success) {
        // Normalize data format
        let contracts: OptionContract[] = [];
        
        if (Array.isArray(data.data)) {
          // Benzinga format
          contracts = data.data;
        } else if (data.data.contracts) {
          // Polygon format
          contracts = data.data.contracts;
        } else if (data.data.unusual_activity) {
          // Polygon unusual activity format
          contracts = data.data.unusual_activity;
        }
        
        // Sort by volume descending
        contracts.sort((a, b) => b.volume - a.volume);
        
        setOptionsData(contracts);
      } else {
        setError(typeof data.error === 'string' ? data.error : (data.error?.message || 'Failed to load options data'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options flow data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOptionsData();
  }, [ticker, dataProvider]);

  const formatExpiration = (expiration: string) => {
    const date = new Date(expiration);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const strike = expiration.split(' ')[0]; // Extract strike if embedded
    return `${month} ${strike || date.getDate()}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)},${(num % 1000).toString().padStart(3, '0')}`;
    }
    return num.toString();
  };

  const filterOptions = (contracts: OptionContract[]) => {
    if (filter === 'all') return contracts;
    if (filter === 'calls') return contracts.filter(c => 
      (c.contract_type === 'call' || c.option_type === 'CALL')
    );
    if (filter === 'puts') return contracts.filter(c => 
      (c.contract_type === 'put' || c.option_type === 'PUT')
    );
    return contracts;
  };

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-openbb-bg-hover rounded w-1/3 mb-4"></div>
          <div className="text-sm text-openbb-text-muted">Loading options flow...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <WidgetHeaderWithTicker
          title="Options Flow"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onRefresh={fetchOptionsData}
          onAdd={() => addWidgetContext(
            WidgetType.OPTIONS_FLOW,
            optionsData,
            ticker,
            'Options Flow Activity'
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="flex items-center gap-2 text-sm text-red-500">
          <AlertCircle size={16} />
          <span>{String(error)}</span>
        </div>
      </div>
    );
  }

  const filteredOptions = filterOptions(optionsData);

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4" data-testid="options-flow-widget">
      <WidgetHeaderWithTicker
        title="Options Flow"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onRefresh={fetchOptionsData}
        onAdd={() => addWidgetContext(
          WidgetType.OPTIONS_FLOW,
          filteredOptions,
          ticker,
          'Options Flow Activity'
        )}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      <div className="flex items-center gap-2 mb-4">
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="p-1.5 rounded hover:bg-openbb-bg-hover transition-colors"
            title="Filter options"
            data-testid="options-filter-button"
          >
            <Filter size={16} className="text-openbb-text-secondary" />
          </button>
          {showFilterMenu && (
            <div className="absolute left-0 top-8 bg-openbb-bg-widget border border-openbb-border rounded shadow-lg z-10 min-w-[120px]">
              <button
                onClick={() => { setFilter('all'); setShowFilterMenu(false); }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-openbb-bg-hover"
              >
                All Options
              </button>
              <button
                onClick={() => { setFilter('calls'); setShowFilterMenu(false); }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-openbb-bg-hover"
              >
                Bullish Only
              </button>
              <button
                onClick={() => { setFilter('puts'); setShowFilterMenu(false); }}
                className="block w-full text-left px-3 py-2 text-sm hover:bg-openbb-bg-hover"
              >
                Bearish Only
              </button>
            </div>
          )}
        </div>
        <span className="text-xs text-openbb-text-muted">
          Filter: {filter === 'all' ? 'All' : filter === 'calls' ? 'Bullish' : 'Bearish'}
        </span>
      </div>

      {filteredOptions.length === 0 ? (
        <div className="text-center py-8 text-sm text-openbb-text-muted">
          No unusual options activity detected
        </div>
      ) : (
        <div className="space-y-2" data-testid="options-list">
          {filteredOptions.slice(0, 10).map((option, idx) => {
            const isCall = option.contract_type === 'call' || option.option_type === 'CALL';
            const price = option.last_price || option.price || 0;
            const isUnusual = (option.volume_ratio && option.volume_ratio > 1.5) || 
                            (option.unusual_activity) ||
                            (option.implied_volatility && option.implied_volatility > 0.4);
            
            return (
              <div
                key={idx}
                className="bg-openbb-bg-primary rounded p-3 border border-openbb-border hover:border-openbb-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isCall ? (
                      <TrendingUp size={16} className="text-green-500" />
                    ) : (
                      <TrendingDown size={16} className="text-red-500" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm  font-semibold text-openbb-text-primary">
                          {formatExpiration(option.expiration)} {option.strike}{isCall ? 'C' : 'P'}
                        </span>
                        {isUnusual && (
                          <span className="text-xs px-1.5 py-0.5 bg-openbb-primary text-white rounded">
                            Unusual
                          </span>
                        )}
                      </div>
                      {option.description && (
                        <div className="text-xs text-openbb-text-muted mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm  text-openbb-text-primary">
                      ${price.toFixed(2)}
                    </div>
                    <div className="text-xs text-openbb-text-muted">
                      Vol: {formatNumber(option.volume)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs ">
                  <div>
                    <span className="text-openbb-text-muted">OI: </span>
                    <span className="text-openbb-text-secondary">{formatNumber(option.open_interest)}</span>
                  </div>
                  {option.implied_volatility && (
                    <div>
                      <span className="text-openbb-text-muted">IV: </span>
                      <span className="text-openbb-text-secondary">
                        {(option.implied_volatility * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                  {option.delta && (
                    <div>
                      <span className="text-openbb-text-muted">Δ: </span>
                      <span className="text-openbb-text-secondary">{option.delta.toFixed(2)}</span>
                    </div>
                  )}
                  {option.sentiment && (
                    <div>
                      <span className={option.sentiment === 'BULLISH' ? 'text-green-500' : 'text-red-500'}>
                        {option.sentiment}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OptionsFlow;