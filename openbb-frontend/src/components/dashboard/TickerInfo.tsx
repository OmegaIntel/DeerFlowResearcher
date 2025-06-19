import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useHistoricalPrice, useFundamentalOverview } from '../../hooks/useOpenBBData';
import classNames from 'classnames';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';

interface TickerInfoProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
}

const TickerInfo: React.FC<TickerInfoProps> = ({ ticker, onTickerChange }) => {
  // Get today's date and 2 days ago for recent price data
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data: priceData, isLoading: priceLoading, error: priceError } = useHistoricalPrice(ticker, startDate, endDate, '1d');
  const { data: fundamentalData, isLoading: fundamentalLoading, error: fundamentalError } = useFundamentalOverview(ticker);
  
  const isLoading = priceLoading || fundamentalLoading;
  const error = priceError || fundamentalError;
  
  const stock = useMemo(() => {
    const priceDataTyped = priceData as any;
    const fundamentalDataTyped = fundamentalData as any;
    
    if (!priceDataTyped?.data || priceDataTyped.data.length < 2 || !fundamentalDataTyped) return null;
    
    const latestPrice = priceDataTyped.data[priceDataTyped.data.length - 1];
    const previousPrice = priceDataTyped.data[priceDataTyped.data.length - 2];
    
    const price = latestPrice.close;
    const change = price - previousPrice.close;
    const changePercent = (change / previousPrice.close) * 100;
    
    return {
      symbol: ticker,
      name: fundamentalDataTyped.name || ticker,
      price,
      change,
      changePercent,
      volume: latestPrice.volume,
      industry: fundamentalDataTyped.industry || 'Technology',
      exchange: fundamentalDataTyped.exchange || 'NASDAQ',
    };
  }, [priceData, fundamentalData, ticker]);

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse" data-testid="loading-skeleton">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/4 mb-4"></div>
        <div className="widget-content flex-1 overflow-auto">
          <div className="h-4 bg-openbb-bg-hover rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-openbb-bg-hover rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
        <p className="text-openbb-danger">Error loading stock data</p>
      </div>
    );
  }

  const isPositive = stock.change >= 0;

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Ticker Information"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onRefresh={() => console.log('Refresh')}
        onAdd={() => console.log('Add to dashboard')}
        onExpand={() => console.log('Expand')}
        onMore={() => console.log('More options')}
      />
      
      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <h2 className="text-sm font-mono font-bold text-openbb-text-primary">{stock.symbol}</h2>
            <span className="text-xs font-mono text-openbb-text-secondary">{stock.name}</span>
          </div>
          
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-lg font-mono font-bold text-openbb-text-primary" data-testid="current-price">
              ${stock.price.toFixed(2)}
            </span>
            
            <div className={classNames(
              'flex items-center gap-1 text-sm font-mono',
              isPositive ? 'text-openbb-success' : 'text-openbb-danger'
            )}>
              <span className="font-semibold">
                {isPositive ? '+' : ''}{stock.change.toFixed(2)}
              </span>
              <span>
                ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </span>
              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-openbb-text-secondary">
            <div className="flex items-center gap-1">
              <Activity size={12} className="text-openbb-accent" />
              <span>Volume: {(stock.volume / 1000000).toFixed(3)}M</span>
            </div>
            <div className="border-l border-openbb-border pl-3">
              Trading Inside of the Normal Range
            </div>
          </div>

          <div className="mt-1 text-xs font-mono text-openbb-text-muted">
            {stock.industry} | US | {stock.exchange}
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-mono text-openbb-text-muted">Day's Change</div>
          <div className={classNames(
            'text-sm font-mono font-bold',
            isPositive ? 'text-openbb-success' : 'text-openbb-danger'
          )}>
            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default TickerInfo;