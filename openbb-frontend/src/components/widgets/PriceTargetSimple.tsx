import React from 'react';
import { usePriceTarget } from '../../hooks/usePriceTarget';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface PriceTargetSimpleProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const PriceTargetSimple: React.FC<PriceTargetSimpleProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: priceTarget, isLoading } = usePriceTarget(ticker);
  const { addWidgetContext } = useCopilot();

  if (isLoading || !priceTarget) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/2 mb-4"></div>
        <div className="widget-content flex-1 overflow-auto">
          <div className="h-32 bg-openbb-bg-hover rounded"></div>
        </div>
      </div>
    );
  }

  const upside = priceTarget.currentPrice > 0 
    ? ((priceTarget.targetMean - priceTarget.currentPrice) / priceTarget.currentPrice * 100)
    : 0;

  const getRecommendationColor = (rec: string) => {
    const buyTerms = ['buy', 'strong buy', 'outperform', 'overweight'];
    const holdTerms = ['hold', 'neutral', 'equal weight'];
    const sellTerms = ['sell', 'underperform', 'underweight'];
    
    const recLower = rec.toLowerCase();
    if (buyTerms.some(term => recLower.includes(term))) return 'text-green-600';
    if (holdTerms.some(term => recLower.includes(term))) return 'text-yellow-600';
    if (sellTerms.some(term => recLower.includes(term))) return 'text-red-600';
    return 'text-openbb-text-primary';
  };

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Price Target"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => addWidgetContext(WidgetType.PRICE_TARGET, priceTarget, ticker, 'Price Target')}
        onSettings={onSettings}
        onRemove={onRemove}
      />

      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden">
        {/* Current Price & Upside */}
        <div className="mb-4 p-3 bg-openbb-bg-hover rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div>
              <div className="text-xs text-openbb-text-muted">Current Price</div>
              <div className="text-lg font-semibold text-openbb-text-primary">
                ${priceTarget.currentPrice.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-openbb-text-muted">Upside/Downside</div>
              <div className={`text-lg font-semibold flex items-center justify-end gap-1 ${upside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {upside >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                {upside >= 0 ? '+' : ''}{upside.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Price Targets */}
        <div className="space-y-3">
          <div className="p-3 bg-openbb-bg-hover rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-openbb-accent" />
              <span className="text-xs font-semibold text-openbb-text-primary">Analyst Price Targets</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-openbb-text-muted">Mean Target</div>
                <div className="text-sm font-medium text-openbb-text-primary">
                  ${priceTarget.targetMean.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-openbb-text-muted">Median Target</div>
                <div className="text-sm font-medium text-openbb-text-primary">
                  ${priceTarget.targetMedian.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-openbb-text-muted">High Target</div>
                <div className="text-sm font-medium text-green-600">
                  ${priceTarget.targetHigh.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-openbb-text-muted">Low Target</div>
                <div className="text-sm font-medium text-red-600">
                  ${priceTarget.targetLow.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Consensus */}
          <div className="p-3 bg-openbb-bg-hover rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-openbb-text-muted">Consensus</div>
                <div className={`text-sm font-semibold uppercase ${getRecommendationColor(priceTarget.recommendation)}`}>
                  {priceTarget.recommendation}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-openbb-text-muted">Analysts</div>
                <div className="text-sm font-medium text-openbb-text-primary">
                  {priceTarget.numberOfAnalysts}
                </div>
              </div>
            </div>
          </div>

          {/* Range Visualization */}
          <div className="p-3 bg-openbb-bg-hover rounded-lg">
            <div className="text-xs text-openbb-text-muted mb-2">Price Range</div>
            <div className="relative h-2 bg-openbb-bg-widget rounded-full">
              <div 
                className="absolute h-2 bg-openbb-accent rounded-full"
                style={{
                  left: `${((priceTarget.targetLow - priceTarget.targetLow) / (priceTarget.targetHigh - priceTarget.targetLow)) * 100}%`,
                  width: `${((priceTarget.targetMean - priceTarget.targetLow) / (priceTarget.targetHigh - priceTarget.targetLow)) * 100}%`
                }}
              />
              <div 
                className="absolute h-4 w-1 bg-openbb-text-primary -top-1 transform -translate-x-1/2"
                style={{
                  left: `${((priceTarget.currentPrice - priceTarget.targetLow) / (priceTarget.targetHigh - priceTarget.targetLow)) * 100}%`
                }}
                title="Current Price"
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-openbb-text-muted">${priceTarget.targetLow.toFixed(0)}</span>
              <span className="text-xs text-openbb-accent">${priceTarget.targetMean.toFixed(0)}</span>
              <span className="text-xs text-openbb-text-muted">${priceTarget.targetHigh.toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-openbb-text-muted text-center">
          Data from {priceTarget.provider || 'Yahoo Finance'}
        </div>
      </div>
    </div>
  );
};

export default PriceTargetSimple;