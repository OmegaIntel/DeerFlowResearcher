import React, { useMemo } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { useCompanyNewsExtended } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';

interface CompanyNewsProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
}

const CompanyNews: React.FC<CompanyNewsProps> = ({ ticker, onTickerChange }) => {
  const { data: newsData, isLoading, error } = useCompanyNewsExtended(ticker, 15);
  
  const news = useMemo(() => {
    if (!newsData || !Array.isArray(newsData)) return [];
    return newsData;
  }, [newsData]);

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-openbb-border pb-3">
              <div className="h-4 bg-openbb-bg-hover rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-openbb-bg-hover rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !news || news.length === 0) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <WidgetHeaderWithTicker
          title="Company News"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onRefresh={() => window.location.reload()}
          onAdd={() => console.log('Add to dashboard')}
          onExpand={() => console.log('Expand')}
          onMore={() => console.log('More options')}
        />
        <p className="text-xs font-mono text-openbb-text-muted">No news available for {ticker}</p>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Company News"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onRefresh={() => console.log('Refresh')}
        onAdd={() => console.log('Add to dashboard')}
        onExpand={() => console.log('Expand')}
        onMore={() => console.log('More options')}
      />
      
      <div className="flex items-center gap-1 text-xs font-mono text-openbb-text-muted mb-3">
        <Calendar size={14} />
        <span>Last 30 days • {news.length} articles</span>
      </div>

      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-2">
        {news.map((item) => (
          <div key={item.id} className="border-b border-openbb-border pb-3 last:border-b-0">
            <div className="flex items-start justify-between mb-2">
              <a
                href={item.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs font-medium text-openbb-text-primary hover:text-openbb-accent cursor-pointer transition-colors duration-200 flex-1 pr-2 line-clamp-2"
              >
                {item.title}
              </a>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-openbb-text-muted hover:text-openbb-accent transition-colors duration-200 flex-shrink-0"
                  title="Open article in new tab"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-openbb-text-muted">
                {item.date}, {item.time}
                {item.source && <span className="ml-2">• {item.source}</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {item.relatedTickers.slice(0, 3).map((relatedTicker: string) => (
                  <span
                    key={relatedTicker}
                    className="text-xs font-mono px-1.5 py-0.5 rounded bg-openbb-bg-secondary text-openbb-text-secondary"
                  >
                    {relatedTicker}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyNews;