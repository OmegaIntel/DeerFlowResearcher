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
  { id: 'technical', label: 'Technical Analysis', isDefault: true },
  { id: 'comparison', label: 'Comparison Analysis', isDefault: true },
  { id: 'ownership', label: 'Ownership', isDefault: true },
  { id: 'calendar', label: 'Company Calendar', isDefault: true },
  { id: 'estimates', label: 'Estimates', isDefault: true },
];

const defaultWidgets: Widget[] = [
  { id: 'default-ticker-info', type: 'ticker-info', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-company-profile', type: 'company-profile', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-price-performance', type: 'price-performance', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-company-news', type: 'company-news', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-key-metrics', type: 'key-metrics', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-share-statistics', type: 'share-statistics', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-management-team', type: 'management-team', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-revenue-geography', type: 'revenue-geography', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-revenue-business', type: 'revenue-business', pageId: 'overview', dashboardId: 'barnes-deal' },
  { id: 'default-valuation-multiples', type: 'valuation-multiples', pageId: 'overview', dashboardId: 'barnes-deal' },
  // Equity Analyst Template widgets
  { id: 'template-ticker-info', type: 'ticker-info', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-company-profile', type: 'company-profile', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-price-performance', type: 'price-performance', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-company-news', type: 'company-news', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-key-metrics', type: 'key-metrics', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-share-statistics', type: 'share-statistics', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-management-team', type: 'management-team', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-revenue-geography', type: 'revenue-geography', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-revenue-business', type: 'revenue-business', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-valuation-multiples', type: 'valuation-multiples', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-price-target', type: 'price-target', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-company-filings', type: 'company-filings', pageId: 'overview', dashboardId: 'equity-analyst-template' },
  { id: 'template-earnings-transcripts', type: 'earnings-transcripts', pageId: 'overview', dashboardId: 'equity-analyst-template' },
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
      'revenue-geography',
      'revenue-business',
      'valuation-multiples',
      'price-target',
      'company-filings',
      'earnings-transcripts',  // Added to make permanent on template
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