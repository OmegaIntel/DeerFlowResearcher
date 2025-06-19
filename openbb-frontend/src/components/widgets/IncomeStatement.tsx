import React, { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, BarChart3 } from 'lucide-react';

interface IncomeStatementProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  dataProvider?: string;
}

interface IncomeStatementData {
  date: string;
  revenue: number;
  costOfRevenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  eps: number;
  operatingExpenses: number;
  interestExpense: number;
  incomeTaxExpense: number;
  depreciationAndAmortization: number;
}

const IncomeStatement: React.FC<IncomeStatementProps> = ({ 
  ticker, 
  onTickerChange, 
  dataProvider = 'auto' 
}) => {
  const [incomeData, setIncomeData] = useState<IncomeStatementData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'annual' | 'quarterly'>('annual');

  const fetchIncomeStatementData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = `/api/v1/equity/fundamental/income-statement?symbol=${ticker}&period=${selectedPeriod}${dataProvider !== 'auto' ? `&provider=${dataProvider}` : ''}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success && data.data) {
        setIncomeData(data.data.slice(0, 5)); // Last 5 periods
      } else {
        setError(typeof data.error === 'string' ? data.error : (data.error?.message || 'Failed to load income statement data'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income statement data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeStatementData();
  }, [ticker, dataProvider, selectedPeriod]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-openbb-bg-hover rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 bg-openbb-bg-hover rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-openbb-primary" />
            <h3 className="text-lg font-mono font-semibold text-openbb-text-primary">Income Statement</h3>
            <span className="text-sm font-mono text-openbb-text-muted">{ticker}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-red-500">
          <span>{String(error)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-openbb-primary" />
          <h3 className="text-lg font-mono font-semibold text-openbb-text-primary">Income Statement</h3>
          <span className="text-sm font-mono text-openbb-text-muted">{ticker}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedPeriod('annual')}
            className={`px-3 py-1 text-xs rounded ${
              selectedPeriod === 'annual'
                ? 'bg-openbb-primary text-white'
                : 'bg-openbb-bg-hover text-openbb-text-secondary'
            }`}
          >
            Annual
          </button>
          <button
            onClick={() => setSelectedPeriod('quarterly')}
            className={`px-3 py-1 text-xs rounded ${
              selectedPeriod === 'quarterly'
                ? 'bg-openbb-primary text-white'
                : 'bg-openbb-bg-hover text-openbb-text-secondary'
            }`}
          >
            Quarterly
          </button>
        </div>
      </div>

      {incomeData.length === 0 ? (
        <div className="text-center py-8 text-sm text-openbb-text-muted">
          No income statement data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-openbb-border">
                <th className="text-left py-2 text-openbb-text-secondary">Period</th>
                {incomeData.map((period, idx) => (
                  <th key={idx} className="text-right py-2 text-openbb-text-secondary min-w-[80px]">
                    {formatDate(period.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-1">
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-openbb-text-primary">Revenue</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-2 text-openbb-text-primary">
                    {formatCurrency(period.revenue)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Cost of Revenue</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-red-400">
                    ({formatCurrency(Math.abs(period.costOfRevenue))})
                  </td>
                ))}
              </tr>
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-green-500">Gross Profit</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-2 text-green-500">
                    {formatCurrency(period.grossProfit)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Operating Expenses</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-red-400">
                    ({formatCurrency(Math.abs(period.operatingExpenses))})
                  </td>
                ))}
              </tr>
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-openbb-text-primary">Operating Income</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-2 text-openbb-text-primary">
                    {formatCurrency(period.operatingIncome)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Interest Expense</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-red-400">
                    ({formatCurrency(Math.abs(period.interestExpense))})
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Income Tax</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-red-400">
                    ({formatCurrency(Math.abs(period.incomeTaxExpense))})
                  </td>
                ))}
              </tr>
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-green-500">Net Income</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className={`text-right py-2 ${period.netIncome >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(period.netIncome)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">EBITDA</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.ebitda)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">EPS</td>
                {incomeData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    ${period.eps?.toFixed(2) || 'N/A'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          
          {/* Key Metrics */}
          <div className="mt-4 pt-4 border-t border-openbb-border">
            <h4 className="text-sm font-mono font-semibold text-openbb-text-primary mb-2">Key Margins</h4>
            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <span className="text-openbb-text-secondary">Gross Margin: </span>
                <span className="text-openbb-text-primary">
                  {incomeData[0] && 
                    ((incomeData[0].grossProfit / incomeData[0].revenue) * 100).toFixed(1)
                  }%
                </span>
              </div>
              <div>
                <span className="text-openbb-text-secondary">Operating Margin: </span>
                <span className="text-openbb-text-primary">
                  {incomeData[0] && 
                    ((incomeData[0].operatingIncome / incomeData[0].revenue) * 100).toFixed(1)
                  }%
                </span>
              </div>
              <div>
                <span className="text-openbb-text-secondary">Net Margin: </span>
                <span className="text-openbb-text-primary">
                  {incomeData[0] && 
                    ((incomeData[0].netIncome / incomeData[0].revenue) * 100).toFixed(1)
                  }%
                </span>
              </div>
            </div>
            
            {incomeData.length > 1 && (
              <div className="mt-3">
                <h4 className="text-sm font-mono font-semibold text-openbb-text-primary mb-2">Growth Rates (YoY)</h4>
                <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-openbb-text-secondary">Revenue: </span>
                    <span className={`${calculateGrowthRate(incomeData[0].revenue, incomeData[1].revenue) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {calculateGrowthRate(incomeData[0].revenue, incomeData[1].revenue).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-openbb-text-secondary">Operating Income: </span>
                    <span className={`${calculateGrowthRate(incomeData[0].operatingIncome, incomeData[1].operatingIncome) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {calculateGrowthRate(incomeData[0].operatingIncome, incomeData[1].operatingIncome).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-openbb-text-secondary">Net Income: </span>
                    <span className={`${calculateGrowthRate(incomeData[0].netIncome, incomeData[1].netIncome) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {calculateGrowthRate(incomeData[0].netIncome, incomeData[1].netIncome).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeStatement;