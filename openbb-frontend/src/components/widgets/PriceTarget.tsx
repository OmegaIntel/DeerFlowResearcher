import React from 'react';
import { RefreshCw, Download, Settings, Maximize2 } from 'lucide-react';
import { useAnalystRatingsRealTime } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';
import { safeDate } from '../../utils/dateUtils';

interface PriceTargetProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const PriceTarget: React.FC<PriceTargetProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: ratingsData = [], isLoading, error } = useAnalystRatingsRealTime(ticker);
  const { addWidgetContext } = useCopilot();

  // Format date to match screenshot
  const formatDate = (dateStr: string) => {
    const date = safeDate(dateStr);
    return date ? date.toISOString().split('T')[0] : 'N/A';
  };

  // Determine rating color based on value
  const getRatingColor = (rating: string) => {
    const buyRatings = ['Buy', 'Overweight', 'Outperform'];
    const holdRatings = ['Hold', 'Neutral', 'Equal-Weight', 'Market Perform'];
    const sellRatings = ['Sell', 'Underweight', 'Underperform'];
    
    if (buyRatings.includes(rating)) return 'text-openbb-success';
    if (holdRatings.includes(rating)) return 'text-yellow-500';
    if (sellRatings.includes(rating)) return 'text-openbb-danger';
    return 'text-openbb-text-primary';
  };

  // Format price target values
  const formatPrice = (price: number) => {
    return price > 0 ? price.toFixed(0) : '-';
  };

  if (isLoading && !ratingsData.length) {
    return (
      <div className="h-full bg-openbb-bg-widget border border-openbb-border">
        <WidgetHeaderWithTicker
          title="Price Target By Analyst"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={ratingsData.length > 0 ? () => addWidgetContext(
            WidgetType.CUSTOM,
            ratingsData,
            ticker,
            'Price Target By Analyst'
          ) : undefined}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="h-full bg-openbb-bg-widget border border-openbb-border flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openbb-accent mx-auto mb-4"></div>
            <p className="text-openbb-text-muted  text-sm">Loading analyst ratings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-openbb-bg-widget border border-openbb-border flex flex-col">
      <WidgetHeaderWithTicker
        title="Price Target By Analyst"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={ratingsData.length > 0 ? () => addWidgetContext(
          WidgetType.CUSTOM,
          ratingsData,
          ticker,
          'Price Target By Analyst'
        ) : undefined}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          {ratingsData.length > 0 ? (
            <span className="text-xs text-openbb-accent  bg-openbb-bg-hover px-2 py-1 rounded">LIVE</span>
          ) : (
            <span className="text-xs text-yellow-500  bg-openbb-bg-hover px-2 py-1 rounded">DEMO</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <RefreshCw size={14} />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Download size={14} />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Settings size={14} />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-grow">
        <table className="w-full text-xs ">
          <thead>
            <tr className="border-b border-openbb-border bg-openbb-bg-secondary sticky top-0 z-10">
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Date</th>
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Analyst Name</th>
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Firm Name</th>
              <th className="text-right py-3 px-4 text-openbb-text-secondary font-medium">Adjusted P...</th>
              <th className="text-right py-3 px-4 text-openbb-text-secondary font-medium">Adjusted Previous Pri...</th>
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Rating Change</th>
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Current Rating</th>
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Previous Rating</th>
            </tr>
          </thead>
          <tbody>
            {ratingsData.map((rating, index) => (
              <tr
                key={index}
                className="hover:bg-openbb-bg-hover transition-colors border-b border-openbb-border/50"
              >
                <td className="py-3 px-4 text-openbb-text-primary">{formatDate(rating.date)}</td>
                <td className="py-3 px-4 text-openbb-text-primary">
                  <div className="flex items-center gap-2">
                    {rating.percentage > 0 && (
                      <span className="bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded text-xs font-bold">
                        {rating.percentage}%
                      </span>
                    )}
                    {rating.analyst_name}
                  </div>
                </td>
                <td className="py-3 px-4 text-openbb-text-primary">{rating.firm_name}</td>
                <td className="text-right py-3 px-4 text-openbb-success font-medium">
                  {formatPrice(rating.adjusted_price_target)}
                </td>
                <td className="text-right py-3 px-4 text-openbb-text-primary">
                  {formatPrice(rating.adjusted_previous_price_target)}
                </td>
                <td className="py-3 px-4 text-openbb-text-primary">{rating.rating_change}</td>
                <td className={`py-3 px-4 font-medium ${getRatingColor(rating.current_rating)}`}>
                  {rating.current_rating}
                </td>
                <td className={`py-3 px-4 ${getRatingColor(rating.previous_rating)}`}>
                  {rating.previous_rating}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {ratingsData.length === 0 && !isLoading && (
          <div className="text-center py-8 text-openbb-text-muted  text-sm">
            No analyst ratings available for {ticker}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="p-3">
          <p className="text-xxs text-openbb-text-muted ">
            Price targets updated in real-time • Percentages indicate upside potential
          </p>
        </div>
      </div>
    </div>
  );
};

export default PriceTarget;