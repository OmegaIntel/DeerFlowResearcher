import React from 'react';
import { X, Plus } from 'lucide-react';
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
import PriceTargetSimple from '../widgets/PriceTargetSimple';
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
  onAdd?: () => void;
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
  'price-target': PriceTargetSimple,
  'price-target-analyst': PriceTarget,
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
  onAdd,
}) => {
  const { widgets } = useWidgets();
  const widget = widgets.find(w => w.id === widgetId);
  const WidgetComponent = widgetComponents[widgetType];
  const [widgetInstance, setWidgetInstance] = React.useState<any>(null);

  if (!WidgetComponent) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <p className="text-openbb-text-muted  text-sm">
          Widget type "{widgetType}" not found
        </p>
      </div>
    );
  }

  const [showSettings, setShowSettings] = React.useState(false);

  const handleSettings = () => {
    setShowSettings(true);
  };

  const handleRemove = () => {
    onRemove(widgetId);
  };

  return (
    <>
      <div className="h-full" data-testid={`widget-${widgetId}`}>
        <div data-testid={`${widgetType}-widget`}>
          <WidgetComponent 
            ticker={ticker} 
            onTickerChange={onTickerChange}
            dataProvider={widget?.dataProvider}
            onSettings={handleSettings}
            onRemove={isRemovable ? handleRemove : undefined}
          />
        </div>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <WidgetSettings
          widgetId={widgetId}
          widgetType={widgetType}
          currentProvider={widget?.dataProvider}
          onSave={() => setShowSettings(false)}
        />
      )}
    </>
  );
};

export default DynamicWidget;