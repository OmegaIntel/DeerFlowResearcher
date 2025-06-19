import React, { useState, useEffect } from 'react';
import { Banknote, Calendar, TrendingUp, BarChart3 } from 'lucide-react';

interface CashFlowStatementProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  dataProvider?: string;
}

interface CashFlowData {
  date: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  freeCashFlow: number;
  capitalExpenditures: number;
  cashAtBeginningOfPeriod: number;
  cashAtEndOfPeriod: number;
  depreciation: number;
  stockBasedCompensation: number;
  dividendsPaid: number;
  acquisitions: number;
}

const CashFlowStatement: React.FC<CashFlowStatementProps> = ({ 
  ticker, 
  onTickerChange, 
  dataProvider = 'auto' 
}) => {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'annual' | 'quarterly'>('annual');

  const fetchCashFlowData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = `/api/v1/equity/fundamental/cash-flow-statement?symbol=${ticker}&period=${selectedPeriod}${dataProvider !== 'auto' ? `&provider=${dataProvider}` : ''}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success && data.data) {
        setCashFlowData(data.data.slice(0, 5)); // Last 5 periods
      } else {
        setError(typeof data.error === 'string' ? data.error : (data.error?.message || 'Failed to load cash flow data'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cash flow data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlowData();
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

  const getCashFlowColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
    return 'text-openbb-text-secondary';
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
            <Banknote size={20} className="text-openbb-primary" />
            <h3 className="text-lg font-mono font-semibold text-openbb-text-primary">Cash Flow Statement</h3>
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
          <Banknote size={20} className="text-openbb-primary" />
          <h3 className="text-lg font-mono font-semibold text-openbb-text-primary">Cash Flow Statement</h3>
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

      {cashFlowData.length === 0 ? (
        <div className="text-center py-8 text-sm text-openbb-text-muted">
          No cash flow data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-openbb-border">
                <th className="text-left py-2 text-openbb-text-secondary">Period</th>
                {cashFlowData.map((period, idx) => (
                  <th key={idx} className="text-right py-2 text-openbb-text-secondary min-w-[80px]">
                    {formatDate(period.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-1">
              {/* Operating Activities */}
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-blue-500">Operating Cash Flow</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className={`text-right py-2 ${getCashFlowColor(period.operatingCashFlow)}`}>
                    {formatCurrency(period.operatingCashFlow)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Depreciation</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.depreciation)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Stock-Based Compensation</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.stockBasedCompensation)}
                  </td>
                ))}
              </tr>
              
              {/* Investing Activities */}
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-orange-500">Investing Cash Flow</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className={`text-right py-2 ${getCashFlowColor(period.investingCashFlow)}`}>
                    {formatCurrency(period.investingCashFlow)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Capital Expenditures</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-red-400">
                    ({formatCurrency(Math.abs(period.capitalExpenditures))})
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Acquisitions</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.acquisitions)}
                  </td>
                ))}
              </tr>
              
              {/* Financing Activities */}
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-purple-500">Financing Cash Flow</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className={`text-right py-2 ${getCashFlowColor(period.financingCashFlow)}`}>
                    {formatCurrency(period.financingCashFlow)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Dividends Paid</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-red-400">
                    ({formatCurrency(Math.abs(period.dividendsPaid))})
                  </td>
                ))}
              </tr>
              
              {/* Net Cash Flow */}
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-openbb-text-primary">Net Cash Flow</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className={`text-right py-2 font-semibold ${getCashFlowColor(period.netCashFlow)}`}>
                    {formatCurrency(period.netCashFlow)}
                  </td>
                ))}
              </tr>
              
              {/* Free Cash Flow */}
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-green-500">Free Cash Flow</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className={`text-right py-2 font-semibold ${getCashFlowColor(period.freeCashFlow)}`}>
                    {formatCurrency(period.freeCashFlow)}
                  </td>
                ))}
              </tr>
              
              {/* Cash Position */}
              <tr>
                <td className="py-1 text-openbb-text-secondary">Cash at Beginning</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.cashAtBeginningOfPeriod)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-primary font-semibold">Cash at End</td>
                {cashFlowData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-primary font-semibold">
                    {formatCurrency(period.cashAtEndOfPeriod)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          
          {/* Key Metrics */}
          <div className="mt-4 pt-4 border-t border-openbb-border">
            <h4 className="text-sm font-mono font-semibold text-openbb-text-primary mb-2">Cash Flow Metrics</h4>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-openbb-text-secondary">FCF Margin: </span>
                <span className="text-green-500">
                  {cashFlowData[0] && cashFlowData[0].operatingCashFlow && 
                    ((cashFlowData[0].freeCashFlow / cashFlowData[0].operatingCashFlow) * 100).toFixed(1)
                  }%
                </span>
              </div>
              <div>
                <span className="text-openbb-text-secondary">Cash Conversion: </span>
                <span className="text-openbb-text-primary">
                  {cashFlowData[0] && cashFlowData[0].operatingCashFlow > 0 ? 'Strong' : 'Weak'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowStatement;