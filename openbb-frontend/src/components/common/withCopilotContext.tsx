import React from 'react';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

export interface WithCopilotProps {
  onAddToCopilot: () => void;
}

/**
 * Higher Order Component that adds Copilot context functionality to widgets
 */
export function withCopilotContext<P extends object>(
  Component: React.ComponentType<P & WithCopilotProps>,
  widgetType: WidgetType,
  getWidgetData: (props: P) => any,
  getWidgetTitle: (props: P) => string
) {
  return React.forwardRef<any, P>((props: P, ref) => {
    const { addWidgetContext } = useCopilot();
    
    const handleAddToCopilot = () => {
      const data = getWidgetData(props);
      const title = getWidgetTitle(props);
      const ticker = (props as any).ticker || 'N/A';
      
      addWidgetContext(widgetType, data, ticker, title);
    };
    
    return <Component {...props} ref={ref} onAddToCopilot={handleAddToCopilot} />;
  });
}