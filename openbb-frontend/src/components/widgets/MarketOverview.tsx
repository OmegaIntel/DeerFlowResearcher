import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { openbbService } from '../../services/openbb-api';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';
import WidgetHeader from '../common/WidgetHeader';

interface MarketOverviewProps {
  onSettings?: () => void;
  onRemove?: () => void;
}

const MarketOverview: React.FC<MarketOverviewProps> = ({ onSettings, onRemove }) => {
  // Fetch major indices
  const indices = ['SPY', 'QQQ', 'DIA', 'IWM', 'VTI'];
  
  const { data: indexData, isLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: async () => {
      const promises = indices.map(symbol => openbbService.getQuote(symbol));
      const results = await Promise.all(promises);
      return results.map((result, index) => ({
        symbol: indices[index],
        name: getIndexName(indices[index]),
        price: result.price || 0,
        change: result.change || 0,
        changePercent: result.changePercent || 0,
      }));
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { addWidgetContext } = useCopilot();

  // Also fetch crypto and forex data
  const { data: cryptoData } = useQuery({
    queryKey: ['crypto-overview'],
    queryFn: async () => {
      const cryptos = ['BTC-USD', 'ETH-USD'];
      const promises = cryptos.map(symbol => openbbService.getCryptoQuote(symbol));
      return Promise.all(promises);
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: forexData } = useQuery({
    queryKey: ['forex-overview'],
    queryFn: async () => {
      const pairs = ['EURUSD', 'GBPUSD', 'USDJPY'];
      const promises = pairs.map(pair => openbbService.getForexQuote(pair));
      return Promise.all(promises);
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  function getIndexName(symbol: string): string {
    const names: Record<string, string> = {
      'SPY': 'S&P 500',
      'QQQ': 'NASDAQ 100',
      'DIA': 'Dow Jones',
      'IWM': 'Russell 2000',
      'VTI': 'Total Market',
    };
    return names[symbol] || symbol;
  }

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-openbb-bg-hover rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
      <WidgetHeader
        title="Market Overview"
        onAdd={() => {
          const marketData = {
            indices: indexData || [],
            crypto: cryptoData || [],
            forex: forexData || [],
          };
          addWidgetContext(WidgetType.MARKET_OVERVIEW, marketData, 'Market Overview');
        }}
        onSettings={onSettings}
        onRemove={onRemove}
      />

      {/* Major Indices */}
      <div className="mb-6">
        <h4 className="text-xs  text-openbb-text-secondary mb-3">Major Indices</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {indexData?.map((index) => (
            <div
              key={index.symbol}
              className="bg-openbb-bg-primary rounded p-3 border border-openbb-border"
            >
              <div className="text-xs  text-openbb-text-secondary mb-1">
                {index.name}
              </div>
              <div className="text-lg  font-semibold text-openbb-text-primary">
                ${index.price.toFixed(2)}
              </div>
              <div
                className={`flex items-center gap-1 text-xs  ${
                  index.changePercent >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {index.changePercent >= 0 ? (
                  <TrendingUp size={12} />
                ) : (
                  <TrendingDown size={12} />
                )}
                <span>
                  {index.changePercent >= 0 ? '+' : ''}
                  {index.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crypto */}
      {cryptoData && (
        <div className="mb-6">
          <h4 className="text-xs  text-openbb-text-secondary mb-3">Cryptocurrency</h4>
          <div className="grid grid-cols-2 gap-3">
            {cryptoData.map((crypto: any, idx: number) => (
              <div
                key={idx}
                className="bg-openbb-bg-primary rounded p-3 border border-openbb-border"
              >
                <div className="text-xs  text-openbb-text-secondary mb-1">
                  {['Bitcoin', 'Ethereum'][idx]}
                </div>
                <div className="text-lg  font-semibold text-openbb-text-primary">
                  ${crypto.price?.toFixed(2) || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forex */}
      {forexData && (
        <div>
          <h4 className="text-xs  text-openbb-text-secondary mb-3">Foreign Exchange</h4>
          <div className="grid grid-cols-3 gap-3">
            {forexData.map((forex: any, idx: number) => (
              <div
                key={idx}
                className="bg-openbb-bg-primary rounded p-3 border border-openbb-border"
              >
                <div className="text-xs  text-openbb-text-secondary mb-1">
                  {['EUR/USD', 'GBP/USD', 'USD/JPY'][idx]}
                </div>
                <div className="text-lg  font-semibold text-openbb-text-primary">
                  {forex.price?.toFixed(4) || 'N/A'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketOverview;