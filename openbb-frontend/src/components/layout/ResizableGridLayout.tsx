import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import DynamicWidget from '../common/DynamicWidget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './ResizableGridLayout.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Widget {
  id: string;
  type: string;
  pageId: string;
  dashboardId: string;
}

interface ResizableGridLayoutProps {
  widgets: Widget[];
  selectedTicker: string;
  onTickerChange: (ticker: string) => void;
  onRemoveWidget: (widgetId: string) => void;
}

// Default widget sizes based on widget type - OpenBB standard sizes
const getDefaultLayout = (widget: Widget): Layout => {
  // Match OpenBB Equity Analyst template layout - modified for half-width default
  const defaults: { [key: string]: { w: number; h: number; minW?: number; minH?: number } } = {
    // First row - 2 widgets (6 cols each - half width)
    'ticker-info': { w: 6, h: 4, minW: 2, minH: 3 },  // 40% of original height (10 -> 4)
    'price-performance': { w: 6, h: 5, minW: 2, minH: 3 },  // 50% of original height (10 -> 5)
    
    // Second row - 2 widgets (6 cols each - half width)
    'key-metrics': { w: 6, h: 6, minW: 2, minH: 4 },  // 70% of previous height (9 -> 6)
    'company-profile': { w: 6, h: 13, minW: 2, minH: 6 },  // 130% of original height (10 -> 13)
    
    // Third row - 2 widgets (6 cols each - half width)
    'company-news': { w: 6, h: 14, minW: 2, minH: 6 },
    'management-team': { w: 6, h: 6, minW: 2, minH: 3 },  // 40% of original height (14 -> 6)
    
    // Fourth row - 2 widgets (6 cols each - half width)
    'share-statistics': { w: 6, h: 7, minW: 2, minH: 4 },  // 50% of original height (14 -> 7)
    'revenue-geography': { w: 6, h: 12, minW: 2, minH: 6 },
    
    // Fifth row - 2 widgets (6 cols each - half width)
    'revenue-business': { w: 6, h: 12, minW: 2, minH: 6 },
    'valuation-multiples': { w: 6, h: 7, minW: 2, minH: 4 },  // 60% of previous height (12 -> 7)
    
    // Other widgets not in default template
    'market-overview': { w: 12, h: 16, minW: 3, minH: 6 },
    'price-chart': { w: 12, h: 16, minW: 3, minH: 6 },
    'insider-trading': { w: 6, h: 14, minW: 2, minH: 6 },
    'institutional-ownership': { w: 6, h: 14, minW: 2, minH: 6 },
    'options-flow': { w: 6, h: 14, minW: 2, minH: 6 },
    'financial-statements': { w: 12, h: 20, minW: 3, minH: 8 },
    'price-target': { w: 6, h: 14, minW: 2, minH: 6 },
    'company-filings': { w: 6, h: 14, minW: 2, minH: 6 },
    'earnings-transcripts': { w: 6, h: 20, minW: 3, minH: 8 },  // 50% of original width (12 -> 6)
  };

  const config = defaults[widget.type] || { w: 6, h: 12, minW: 2, minH: 4 };
  
  return {
    i: widget.id,
    x: 0,
    y: 0,
    ...config,
  };
};

const ResizableGridLayout: React.FC<ResizableGridLayoutProps> = ({
  widgets,
  selectedTicker,
  onTickerChange,
  onRemoveWidget,
}) => {
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({});
  
  // Initialize layouts when widgets change
  useEffect(() => {
    const savedLayouts = localStorage.getItem('widget-layouts');
    if (savedLayouts) {
      try {
        const parsed = JSON.parse(savedLayouts);
        // Validate saved layouts and merge with defaults
        const validatedLayouts: { [key: string]: Layout[] } = {
          lg: widgets.map((widget) => {
            const savedLayout = parsed.lg?.find((l: Layout) => l.i === widget.id);
            const defaultLayout = getDefaultLayout(widget);
            
            // If saved layout exists but has invalid size (1x1), use defaults
            if (savedLayout && (savedLayout.w === 1 && savedLayout.h === 1)) {
              return {
                ...savedLayout,
                ...defaultLayout,
                x: savedLayout.x,
                y: savedLayout.y
              };
            }
            
            return savedLayout || defaultLayout;
          }),
        };
        
        setLayouts(validatedLayouts);
        return;
      } catch (e) {
        console.error('Failed to load saved layouts:', e);
        localStorage.removeItem('widget-layouts'); // Clear invalid data
      }
    }

    // Smart positioning for default layouts
    const newLayouts: { [key: string]: Layout[] } = {
      lg: widgets.map((widget, index) => {
        const existingLayout = layouts.lg?.find(l => l.i === widget.id);
        if (existingLayout) {
          return existingLayout;
        }
        
        const defaultLayout = getDefaultLayout(widget);
        
        // Smart positioning based on widget type - half-width layout
        if (widget.type === 'ticker-info') {
          // First row - left half
          defaultLayout.x = 0;
          defaultLayout.y = 0;
        } else if (widget.type === 'price-performance') {
          // First row - right half
          defaultLayout.x = 6;
          defaultLayout.y = 0;
        } else if (widget.type === 'key-metrics') {
          // Second row - left half
          defaultLayout.x = 0;
          defaultLayout.y = 9;  // Adjusted for ticker-info height change (4+5=9)
        } else if (widget.type === 'company-profile') {
          // Second row - right half
          defaultLayout.x = 6;
          defaultLayout.y = 9;  // Adjusted for ticker-info height change
        } else if (widget.type === 'company-news') {
          // Third row - left half
          defaultLayout.x = 0;
          defaultLayout.y = 15;  // Adjusted for key-metrics height change (9+6=15)
        } else if (widget.type === 'management-team') {
          // Third row - right half
          defaultLayout.x = 6;
          defaultLayout.y = 22;  // Adjusted for company-profile height change (9+13=22)
        } else if (widget.type === 'share-statistics') {
          // Fourth row - left half
          defaultLayout.x = 0;
          defaultLayout.y = 29;  // Adjusted for company-news height change (15+14=29)
        } else if (widget.type === 'revenue-geography') {
          // Fourth row - right half
          defaultLayout.x = 6;
          defaultLayout.y = 28;  // Adjusted for management-team height change (22+6=28)
        } else if (widget.type === 'revenue-business') {
          // Fifth row - left half
          defaultLayout.x = 0;
          defaultLayout.y = 36;  // Adjusted for share-statistics height change (29+7=36)
        } else if (widget.type === 'valuation-multiples') {
          // Fifth row - right half
          defaultLayout.x = 6;
          defaultLayout.y = 40;  // Adjusted for revenue-geography height change (28+12=40)
        } else if (widget.type === 'price-target') {
          // Sixth row - left half
          defaultLayout.x = 0;
          defaultLayout.y = 48;  // Adjusted for revenue-business height change (36+12=48)
        } else if (widget.type === 'company-filings') {
          // Sixth row - right half
          defaultLayout.x = 6;
          defaultLayout.y = 47;  // Adjusted for valuation-multiples height change (40+7=47)
        } else if (widget.type === 'earnings-transcripts') {
          // Seventh row - left half (now 50% width as requested)
          defaultLayout.x = 0;
          defaultLayout.y = 62;  // Adjusted for price-target height change (48+14=62)
        } else if (widget.type === 'price-chart') {
          // Additional widgets below
          defaultLayout.x = 0;
          defaultLayout.y = 82;
        } else {
          // Default positioning for other widgets
          defaultLayout.x = (index % 2) * 6;
          defaultLayout.y = Math.floor(index / 2) * 14 + 112;
        }
        
        return defaultLayout;
      }),
    };
    
    setLayouts(newLayouts);
  }, [widgets]); // Re-run when widgets array changes

  const handleLayoutChange = (_currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
    setLayouts(allLayouts);
    // Save layouts to localStorage for persistence
    localStorage.setItem('widget-layouts', JSON.stringify(allLayouts));
  };


  if (widgets.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-openbb-text-muted ">No widgets added to this page yet</p>
      </div>
    );
  }

  return (
    <div className="p-2 pb-8 w-full min-w-0 bg-openbb-bg-primary">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        isDraggable={true}
        isResizable={true}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        draggableHandle=".widget-drag-handle"
        draggableCancel=".widget-no-drag"
        resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
        width="100%"
      >
        {widgets.map((widget) => (
          <div key={widget.id} className="openbb-widget-container">
            <DynamicWidget
              widgetId={widget.id}
              widgetType={widget.type}
              ticker={selectedTicker}
              onRemove={onRemoveWidget}
              onTickerChange={onTickerChange}
              isRemovable={true}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default ResizableGridLayout;