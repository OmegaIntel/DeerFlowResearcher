import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useWidgets } from './WidgetContext';

interface Dashboard {
  id: string;
  name: string;
  ticker: string;
  isTemplate?: boolean;
  createdAt: Date;
}

interface DashboardContextType {
  dashboards: Dashboard[];
  activeDashboardId: string;
  createDashboard: (name: string, ticker: string) => void;
  deleteDashboard: (id: string) => void;
  setActiveDashboard: (id: string) => void;
  renameDashboard: (id: string, newName: string) => void;
  createFromTemplate: (templateId: string, name: string, ticker: string) => void;
  updateDashboardTicker: (id: string, ticker: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboards = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboards must be used within a DashboardProvider');
  }
  return context;
};

// Default dashboards including the Equity Analyst template
const defaultDashboards: Dashboard[] = [
  {
    id: 'barnes-deal',
    name: 'Dashboard Barnes Deal',
    ticker: 'AAPL',
    createdAt: new Date(),
  },
  {
    id: 'tesla-test',
    name: 'Tesla Data Test',
    ticker: 'TSLA',
    createdAt: new Date(),
  },
  {
    id: 'equity-analyst-template',
    name: 'Equity Analyst',
    ticker: 'AAPL',
    isTemplate: true,
    createdAt: new Date(),
  },
];

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dashboards, setDashboards] = useState<Dashboard[]>(defaultDashboards);
  const [activeDashboardId, setActiveDashboardId] = useState<string>('equity-analyst-template');
  const { addDefaultWidgetsForDashboard } = useWidgets();

  const createDashboard = (name: string, ticker: string) => {
    const newDashboard: Dashboard = {
      id: `dashboard-${Date.now()}`,
      name,
      ticker,
      createdAt: new Date(),
    };
    setDashboards([...dashboards, newDashboard]);
    setActiveDashboardId(newDashboard.id);
  };

  const deleteDashboard = (id: string) => {
    setDashboards(dashboards.filter(d => d.id !== id));
    if (activeDashboardId === id && dashboards.length > 1) {
      const remainingDashboards = dashboards.filter(d => d.id !== id);
      setActiveDashboardId(remainingDashboards[0].id);
    }
  };

  const setActiveDashboard = (id: string) => {
    setActiveDashboardId(id);
  };

  const renameDashboard = (id: string, newName: string) => {
    setDashboards(dashboards.map(d => 
      d.id === id ? { ...d, name: newName } : d
    ));
  };

  const createFromTemplate = (templateId: string, name: string, ticker: string) => {
    const template = dashboards.find(d => d.id === templateId && d.isTemplate);
    if (template && templateId === 'equity-analyst-template') {
      const newDashboard: Dashboard = {
        id: `dashboard-${Date.now()}`,
        name,
        ticker,
        createdAt: new Date(),
      };
      setDashboards([...dashboards, newDashboard]);
      setActiveDashboardId(newDashboard.id);
      
      // Add default widgets for Equity Analyst template
      setTimeout(() => {
        addDefaultWidgetsForDashboard(newDashboard.id);
      }, 100);
    }
  };

  const updateDashboardTicker = (id: string, ticker: string) => {
    setDashboards(dashboards.map(d => 
      d.id === id ? { ...d, ticker } : d
    ));
  };

  return (
    <DashboardContext.Provider value={{
      dashboards,
      activeDashboardId,
      createDashboard,
      deleteDashboard,
      setActiveDashboard,
      renameDashboard,
      createFromTemplate,
      updateDashboardTicker,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};