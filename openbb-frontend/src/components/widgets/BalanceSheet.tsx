import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, TrendingUp, BarChart3 } from 'lucide-react';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';
import WidgetHeader from '../common/WidgetHeader';
import { safeDateString } from '../../utils/dateUtils';

interface BalanceSheetProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  dataProvider?: string;
  onSettings?: () => void;
  onRemove?: () => void;
}

interface BalanceSheetData {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalShareholderEquity: number;
  cashAndCashEquivalents: number;
  totalDebt: number;
  totalCurrentAssets: number;
  totalCurrentLiabilities: number;
  workingCapital: number;
  retainedEarnings: number;
  commonStock: number;
}

const BalanceSheet: React.FC<BalanceSheetProps> = ({ 
  ticker, 
  onTickerChange, 
  dataProvider = 'auto',
  onSettings,
  onRemove 
}) => {
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'annual' | 'quarterly'>('annual');
  const { addWidgetContext } = useCopilot();

  const fetchBalanceSheetData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = `/api/v1/equity/fundamental/balance-sheet?symbol=${ticker}&period=${selectedPeriod}${dataProvider !== 'auto' ? `&provider=${dataProvider}` : ''}`;
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.success && data.data) {
        setBalanceSheetData(data.data.slice(0, 5)); // Last 5 periods
      } else {
        setError(typeof data.error === 'string' ? data.error : (data.error?.message || 'Failed to load balance sheet data'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balance sheet data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceSheetData();
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
    const formatted = safeDateString(dateString);
    if (formatted === 'N/A') return formatted;
    
    // Format as "MMM YYYY" if we got a valid date
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
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
        <WidgetHeader
          title={`Balance Sheet - ${ticker}`}
          onRefresh={fetchBalanceSheetData}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="flex items-center gap-2 text-sm text-red-500">
          <span>{String(error)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
      <div className="mb-4">
        <WidgetHeader
          title={`Balance Sheet - ${ticker}`}
          onRefresh={fetchBalanceSheetData}
          onAdd={() => addWidgetContext(
            WidgetType.BALANCE_SHEET,
            balanceSheetData,
            ticker,
            `Balance Sheet (${selectedPeriod})`
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="flex gap-2 mt-2">
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

      {balanceSheetData.length === 0 ? (
        <div className="text-center py-8 text-sm text-openbb-text-muted">
          No balance sheet data available
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs ">
            <thead>
              <tr className="border-b border-openbb-border">
                <th className="text-left py-2 text-openbb-text-secondary">Period</th>
                {balanceSheetData.map((period, idx) => (
                  <th key={idx} className="text-right py-2 text-openbb-text-secondary min-w-[80px]">
                    {formatDate(period.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-1">
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-openbb-text-primary">Total Assets</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-2 text-openbb-text-primary">
                    {formatCurrency(period.totalAssets)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Cash & Equivalents</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.cashAndCashEquivalents)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Current Assets</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.totalCurrentAssets)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-openbb-text-primary">Total Liabilities</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-2 text-openbb-text-primary">
                    {formatCurrency(period.totalLiabilities)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Current Liabilities</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.totalCurrentLiabilities)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Total Debt</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.totalDebt)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-openbb-border/50">
                <td className="py-2 font-semibold text-green-500">Shareholder Equity</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-2 text-green-500">
                    {formatCurrency(period.totalShareholderEquity)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Retained Earnings</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.retainedEarnings)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1 text-openbb-text-secondary pl-4">Common Stock</td>
                {balanceSheetData.map((period, idx) => (
                  <td key={idx} className="text-right py-1 text-openbb-text-secondary">
                    {formatCurrency(period.commonStock)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          
          {/* Key Ratios */}
          <div className="mt-4 pt-4 border-t border-openbb-border">
            <h4 className="text-sm  font-semibold text-openbb-text-primary mb-2">Key Ratios</h4>
            <div className="grid grid-cols-2 gap-4 text-xs ">
              <div>
                <span className="text-openbb-text-secondary">Working Capital: </span>
                <span className="text-openbb-text-primary">
                  {balanceSheetData[0] && formatCurrency(balanceSheetData[0].workingCapital)}
                </span>
              </div>
              <div>
                <span className="text-openbb-text-secondary">Debt to Equity: </span>
                <span className="text-openbb-text-primary">
                  {balanceSheetData[0] && 
                    (balanceSheetData[0].totalDebt / balanceSheetData[0].totalShareholderEquity).toFixed(2)
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSheet;