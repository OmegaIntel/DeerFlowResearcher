import React from 'react';
import { X } from 'lucide-react';
import { useWidgets } from '../../contexts/WidgetContext';
import WidgetSettings from './WidgetSettings';
import TickerInfo from '../dashboard/TickerInfo';
import CompanyProfile from '../dashboard/CompanyProfile';
import PricePerformance from '../dashboard/PricePerformance';
import CompanyNews from '../dashboard/CompanyNews';
import KeyMetrics from '../dashboard/KeyMetrics';
import ShareStatistics from '../dashboard/ShareStatistics';
import ManagementTeam from '../dashboard/ManagementTeam';
import RevenuePerGeography from '../dashboard/RevenuePerGeography';
import RevenuePerBusinessLine from '../dashboard/RevenuePerBusinessLine';
import PriceChart from '../dashboard/PriceChart';
// OpenBB Enhanced Widgets
import MarketOverview from '../widgets/MarketOverview';
import OptionsFlow from '../widgets/OptionsFlow';
import InsiderTrading from '../widgets/InsiderTrading';
import InstitutionalOwnership from '../widgets/InstitutionalOwnership';
import FinancialStatements from '../widgets/FinancialStatements';
import PriceTarget from '../widgets/PriceTarget';
import CompanyFilings from '../widgets/CompanyFilings';
import ValuationMultiples from '../widgets/ValuationMultiples';
import EarningsTranscripts from '../widgets/EarningsTranscripts';
import BalanceSheet from '../widgets/BalanceSheet';
import IncomeStatement from '../widgets/IncomeStatement';
import CashFlowStatement from '../widgets/CashFlowStatement';

interface DynamicWidgetProps {
  widgetId: string;
  widgetType: string;
  ticker: string;
  onRemove: (widgetId: string) => void;
  onTickerChange?: (ticker: string) => void;
  isRemovable?: boolean;
}

const widgetComponents: { [key: string]: React.ComponentType<any> } = {
  // Existing widgets
  'ticker-info': TickerInfo,
  'company-profile': CompanyProfile,
  'price-performance': PricePerformance,
  'company-news': CompanyNews,
  'key-metrics': KeyMetrics,
  'share-statistics': ShareStatistics,
  'management-team': ManagementTeam,
  'revenue-geography': RevenuePerGeography,
  'revenue-business': RevenuePerBusinessLine,
  'valuation-multiples': ValuationMultiples,
  'price-chart': PriceChart,
  // OpenBB Enhanced Widgets
  'market-overview': MarketOverview,
  'options-flow': OptionsFlow,
  'insider-trading': InsiderTrading,
  'institutional-ownership': InstitutionalOwnership,
  'financial-statements': FinancialStatements,
  'price-target': PriceTarget,
  'company-filings': CompanyFilings,
  'earnings-transcripts': EarningsTranscripts,
  'balance-sheet': BalanceSheet,
  'income-statement': IncomeStatement,
  'cash-flow-statement': CashFlowStatement,
};

const DynamicWidget: React.FC<DynamicWidgetProps> = ({
  widgetId,
  widgetType,
  ticker,
  onRemove,
  onTickerChange,
  isRemovable = true,
}) => {
  const { widgets } = useWidgets();
  const widget = widgets.find(w => w.id === widgetId);
  const WidgetComponent = widgetComponents[widgetType];

  if (!WidgetComponent) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <p className="text-openbb-text-muted font-mono text-sm">
          Widget type "{widgetType}" not found
        </p>
      </div>
    );
  }

  return (
    <div className="relative group h-full" data-testid={`widget-${widgetId}`}>
      <div data-testid={`${widgetType}-widget`}>
        <WidgetComponent 
          ticker={ticker} 
          onTickerChange={onTickerChange}
          dataProvider={widget?.dataProvider}
        />
      </div>
      
      {/* Widget Controls - visible on hover */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
        {/* Settings Button */}
        <div className="bg-openbb-bg-widget border border-openbb-border rounded">
          <WidgetSettings
            widgetId={widgetId}
            widgetType={widgetType}
            currentProvider={widget?.dataProvider}
          />
        </div>
        
        {/* Remove Button */}
        {isRemovable && (
          <button
            onClick={() => onRemove(widgetId)}
            className="p-1.5 bg-openbb-bg-widget border border-openbb-border rounded hover:bg-openbb-danger hover:border-openbb-danger hover:text-white"
            title="Remove Widget"
            data-testid="remove-widget-button"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default DynamicWidget;