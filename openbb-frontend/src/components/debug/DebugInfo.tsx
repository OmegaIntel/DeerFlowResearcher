import React from 'react';
import { useWidgets } from '../../contexts/WidgetContext';
import { useDashboards } from '../../contexts/DashboardContext';

const DebugInfo: React.FC = () => {
  const { widgets } = useWidgets();
  const { activeDashboardId, dashboards } = useDashboards();
  
  const overviewWidgets = widgets.filter(w => 
    w.pageId === 'overview' && w.dashboardId === activeDashboardId
  );
  
  return (
    <div style={{ position: 'fixed', top: 10, right: 10, background: '#333', color: '#fff', padding: 10, fontSize: 12, zIndex: 9999 }}>
      <h4>Debug Info</h4>
      <p>Active Dashboard: {activeDashboardId}</p>
      <p>Total Widgets: {widgets.length}</p>
      <p>Overview Widgets: {overviewWidgets.length}</p>
      <p>Dashboard exists: {dashboards.some(d => d.id === activeDashboardId) ? 'Yes' : 'No'}</p>
      <details>
        <summary>Widgets</summary>
        <pre>{JSON.stringify(overviewWidgets.slice(0, 3), null, 2)}</pre>
      </details>
    </div>
  );
};

export default DebugInfo;