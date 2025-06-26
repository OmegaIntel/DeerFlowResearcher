import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Widget {
  id: string;
  type: string;
  pageId: string;
  dashboardId: string;
  dataProvider?: string;
}

interface Page {
  id: string;
  label: string;
  isDefault?: boolean;
  isCustom?: boolean;
}

interface WidgetContextType {
  widgets: Widget[];
  pages: Page[];
  addWidgets: (widgetTypes: string[], pageId: string, dashboardId: string) => void;
  removeWidget: (widgetId: string) => void;
  updatePages: (pages: Page[]) => void;
  addDefaultWidgetsForDashboard: (dashboardId: string) => void;
  updateWidgetProvider: (widgetId: string, provider: string) => void;
}

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

export const useWidgets = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error('useWidgets must be used within a WidgetProvider');
  }
  return context;
};

const defaultPages: Page[] = [
  { id: 'overview', label: 'Overview', isDefault: true },
  { id: 'financials', label: 'Financials', isDefault: true },
  { id: 'comparison', label: 'Comparison Analysis', isDefault: true },
  { id: 'ownership', label: 'Ownership', isDefault: true },
  { id: 'calendar', label: 'Company Calendar', isDefault: true },
  { id: 'estimates', label: 'Estimates', isDefault: true },
  { id: 'templates', label: 'Templates', isDefault: true },
  { id: 'mindsdb', label: 'MindsDB', isDefault: true },
  { id: 'private-companies', label: 'Private Companies', isDefault: true },
  { id: 'dealroom', label: 'Dealroom', isDefault: true },
];

const defaultWidgets: Widget[] = [
  { id: 'default-ticker-info', type: 'ticker-info', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-company-profile', type: 'company-profile', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-price-performance', type: 'price-performance', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-company-news', type: 'company-news', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-key-metrics', type: 'key-metrics', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-share-statistics', type: 'share-statistics', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-management-team', type: 'management-team', pageId: 'overview', dashboardId: 'barnes-deal' },
  // Removed revenue-geography and revenue-business as they require premium FMP subscription
  { id: 'default-valuation-multiples', type: 'valuation-multiples', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-price-target', type: 'price-target', pageId: 'overview', dashboardId: 'barnes-deal' },
  // Tesla Test Dashboard - All Available Widgets
  // Overview Page
  { id: 'tesla-ticker-info', type: 'ticker-info', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-company-profile', type: 'company-profile', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-management-team', type: 'management-team', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-company-filings', type: 'company-filings', pageId: 'overview', dashboardId: 'tesla-test' },
  // Removed earnings-transcripts as API Ninjas requires specific configuration
  { id: 'tesla-price-performance', type: 'price-performance', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-price-chart', type: 'price-chart', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-volume-chart', type: 'volume-chart', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-key-metrics', type: 'key-metrics', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-share-statistics', type: 'share-statistics', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-valuation-multiples', type: 'valuation-multiples', pageId: 'overview', dashboardId: 'tesla-test' },
  // Removed revenue-geography and revenue-business as they require premium FMP subscription
  { id: 'tesla-company-news', type: 'company-news', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-market-news', type: 'market-news', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-price-target', type: 'price-target', pageId: 'overview', dashboardId: 'tesla-test' },
  // Removed analyst-ratings as Benzinga requires premium subscription
  { id: 'tesla-market-overview', type: 'market-overview', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-real-time-quotes', type: 'real-time-quotes', pageId: 'overview', dashboardId: 'tesla-test' },
  { id: 'tesla-last-trade', type: 'last-trade', pageId: 'overview', dashboardId: 'tesla-test' },
  // Financials Page
  { id: 'tesla-income-statement', type: 'income-statement', pageId: 'financials', dashboardId: 'tesla-test' },
  { id: 'tesla-balance-sheet', type: 'balance-sheet', pageId: 'financials', dashboardId: 'tesla-test' },
  { id: 'tesla-cash-flow-statement', type: 'cash-flow-statement', pageId: 'financials', dashboardId: 'tesla-test' },
  { id: 'tesla-financial-statements', type: 'financial-statements', pageId: 'financials', dashboardId: 'tesla-test' },
  // Ownership Page
  { id: 'tesla-institutional-ownership', type: 'institutional-ownership', pageId: 'ownership', dashboardId: 'tesla-test' },
  { id: 'tesla-insider-trading', type: 'insider-trading', pageId: 'ownership', dashboardId: 'tesla-test' },
  { id: 'tesla-options-flow', type: 'options-flow', pageId: 'ownership', dashboardId: 'tesla-test' },
  { id: 'tesla-options-chain', type: 'options-chain', pageId: 'ownership', dashboardId: 'tesla-test' },
  { id: 'tesla-unusual-options', type: 'unusual-options', pageId: 'ownership', dashboardId: 'tesla-test' },
  // Equity Analyst Template widgets
  { id: 'template-ticker-info', type: 'ticker-info', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-company-profile', type: 'company-profile', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-price-performance', type: 'price-performance', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-company-news', type: 'company-news', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-key-metrics', type: 'key-metrics', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-share-statistics', type: 'share-statistics', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-management-team', type: 'management-team', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  // Removed revenue-geography and revenue-business as they require premium FMP subscription
  { id: 'template-valuation-multiples', type: 'valuation-multiples', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-price-target', type: 'price-target', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-company-filings', type: 'company-filings', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  // Removed earnings-transcripts as API Ninjas requires specific configuration
  // Financial Statements widgets
  { id: 'default-financial-statements', type: 'financial-statements', pageId: 'financials', dashboardId: 'barnes-deal' },
  { id: 'template-financial-statements', type: 'financial-statements', pageId: 'financials', dashboardId: 'equity-analyst-template' },
];

export const WidgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [pages, setPages] = useState<Page[]>(defaultPages);

  const addWidgets = (widgetTypes: string[], pageId: string, dashboardId: string) => {
    const newWidgets = widgetTypes.map(type => ({
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      pageId,
      dashboardId,
    }));
    setWidgets([...widgets, ...newWidgets]);
  };

  const removeWidget = (widgetId: string) => {
    // Allow removal of all widgets including default ones
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const updatePages = (newPages: Page[]) => {
    setPages(newPages);
  };

  const updateWidgetProvider = (widgetId: string, provider: string) => {
    setWidgets(widgets.map(widget => 
      widget.id === widgetId 
        ? { ...widget, dataProvider: provider }
        : widget
    ));
  };

  // Add default widgets for a new dashboard created from template
  const addDefaultWidgetsForDashboard = (dashboardId: string) => {
    const defaultWidgetTypes = [
      'ticker-info',
      'company-profile',
      'price-performance',
      'company-news',
      'key-metrics',
      'share-statistics',
      'management-team',
      // Removed revenue-geography and revenue-business as they require premium FMP subscription
      'valuation-multiples',
      'price-target',
      'company-filings',
      'earnings-transcripts',  // Working with API Ninjas (requires year/quarter parameters)
      'price-chart',
    ];

    const newWidgets = defaultWidgetTypes.map(type => ({
      id: `${dashboardId}-${type}-${Date.now()}`,
      type,
      pageId: 'overview',
      dashboardId,
    }));

    setWidgets([...widgets, ...newWidgets]);
  };

  return (
    <WidgetContext.Provider value={{ 
      widgets, 
      pages, 
      addWidgets, 
      removeWidget, 
      updatePages,
      addDefaultWidgetsForDashboard,
      updateWidgetProvider
    }}>
      {children}
    </WidgetContext.Provider>
  );
};