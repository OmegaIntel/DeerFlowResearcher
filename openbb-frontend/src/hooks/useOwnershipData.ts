import { useState, useEffect } from 'react';
import { getInstitutionalOwnership, getStockOwnership, getInsiderTrading } from '../services/ownershipService';

interface InstitutionalMetric {
  metric: string;
  currentQuarter: string | number;
  pastQuarter: string | number;
  change: string | number;
  percentageChange: string | number;
  isPositive?: boolean;
}

interface StockOwnershipRow {
  investorName: string;
  investmentDiscretion: 'SOLE' | 'DFND' | 'SHRD' | 'OTR';
  sharesHeld: string;
  changeInShares: string;
  percentageChange: number;
  marketValue: string;
  portfolioWeight: number;
  prevPortfolioWeight?: number;
}

export const useInstitutionalOwnership = (ticker: string) => {
  const [data, setData] = useState<InstitutionalMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!ticker) return;
      
      setLoading(true);
      setError(null);

      try {
        const ownershipData = await getInstitutionalOwnership(ticker);
        
        if (ownershipData.length >= 2) {
          const current = ownershipData[0];
          const past = ownershipData[1];

          const metrics: InstitutionalMetric[] = [
            {
              metric: 'Investors Holding',
              currentQuarter: current.investorsHolding.toLocaleString(),
              pastQuarter: past.investorsHolding.toLocaleString(),
              change: (current.investorsHolding - past.investorsHolding).toLocaleString(),
              percentageChange: ((current.investorsHolding - past.investorsHolding) / past.investorsHolding * 100).toFixed(2),
              isPositive: current.investorsHolding > past.investorsHolding
            },
            {
              metric: 'Number Of Shares',
              currentQuarter: formatLargeNumber(current.sharesHeld),
              pastQuarter: formatLargeNumber(past.sharesHeld),
              change: formatLargeNumber(current.sharesHeld - past.sharesHeld),
              percentageChange: ((current.sharesHeld - past.sharesHeld) / past.sharesHeld * 100).toFixed(2),
              isPositive: current.sharesHeld > past.sharesHeld
            },
            {
              metric: 'Total Invested',
              currentQuarter: formatCurrency(current.marketValue),
              pastQuarter: formatCurrency(past.marketValue),
              change: formatCurrency(current.marketValue - past.marketValue),
              percentageChange: ((current.marketValue - past.marketValue) / past.marketValue * 100).toFixed(2),
              isPositive: current.marketValue > past.marketValue
            },
            {
              metric: 'Ownership Percent',
              currentQuarter: current.reportedHoldingPercent.toFixed(2),
              pastQuarter: past.reportedHoldingPercent.toFixed(2),
              change: (current.reportedHoldingPercent - past.reportedHoldingPercent).toFixed(2),
              percentageChange: ((current.reportedHoldingPercent - past.reportedHoldingPercent) / past.reportedHoldingPercent * 100).toFixed(2),
              isPositive: current.reportedHoldingPercent > past.reportedHoldingPercent
            }
          ];

          // Add optional metrics if available
          if (current.newPositions !== undefined) {
            metrics.push({
              metric: 'New Positions',
              currentQuarter: current.newPositions.toLocaleString(),
              pastQuarter: past.newPositions?.toLocaleString() || '0',
              change: (current.newPositions - (past.newPositions || 0)).toLocaleString(),
              percentageChange: ((current.newPositions - (past.newPositions || 0)) / (past.newPositions || 1) * 100).toFixed(2),
              isPositive: false // New positions decreasing is typically negative
            });
          }

          if (current.increasedPositions !== undefined) {
            metrics.push({
              metric: 'Increased Positions',
              currentQuarter: current.increasedPositions.toLocaleString(),
              pastQuarter: past.increasedPositions?.toLocaleString() || '0',
              change: (current.increasedPositions - (past.increasedPositions || 0)).toLocaleString(),
              percentageChange: ((current.increasedPositions - (past.increasedPositions || 0)) / (past.increasedPositions || 1) * 100).toFixed(2),
              isPositive: false
            });
          }

          if (current.closedPositions !== undefined) {
            metrics.push({
              metric: 'Closed Positions',
              currentQuarter: current.closedPositions.toLocaleString(),
              pastQuarter: past.closedPositions?.toLocaleString() || '0',
              change: (current.closedPositions - (past.closedPositions || 0)).toLocaleString(),
              percentageChange: ((current.closedPositions - (past.closedPositions || 0)) / (past.closedPositions || 1) * 100).toFixed(2),
              isPositive: true // Closed positions increasing could be seen as positive (profit taking)
            });
          }

          if (current.reducedPositions !== undefined) {
            metrics.push({
              metric: 'Reduced Positions',
              currentQuarter: current.reducedPositions.toLocaleString(),
              pastQuarter: past.reducedPositions?.toLocaleString() || '0',
              change: (current.reducedPositions - (past.reducedPositions || 0)).toLocaleString(),
              percentageChange: ((current.reducedPositions - (past.reducedPositions || 0)) / (past.reducedPositions || 1) * 100).toFixed(2),
              isPositive: true
            });
          }

          if (current.putCallRatio !== undefined) {
            metrics.push({
              metric: 'Put/Call Ratio',
              currentQuarter: current.putCallRatio.toFixed(2),
              pastQuarter: past.putCallRatio?.toFixed(2) || '0',
              change: (current.putCallRatio - (past.putCallRatio || 0)).toFixed(2),
              percentageChange: ((current.putCallRatio - (past.putCallRatio || 0)) / (past.putCallRatio || 1) * 100).toFixed(2),
              isPositive: false // Higher put/call ratio is bearish
            });
          }

          setData(metrics);
        }
      } catch (err) {
        console.error('Error fetching institutional ownership:', err);
        setError('Failed to load institutional ownership data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  return { data, loading, error };
};

export const useStockOwnership = (ticker: string) => {
  const [data, setData] = useState<StockOwnershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!ticker) return;
      
      setLoading(true);
      setError(null);

      try {
        const ownershipData = await getStockOwnership(ticker);
        
        const formatted: StockOwnershipRow[] = ownershipData.map(holder => ({
          investorName: holder.investorName,
          investmentDiscretion: (holder.investmentDiscretion as any) || 'OTR',
          sharesHeld: formatShareCount(holder.sharesHeld),
          changeInShares: formatShareChange(holder.changeInShares),
          percentageChange: holder.percentageChange,
          marketValue: formatCurrency(holder.marketValue),
          portfolioWeight: holder.portfolioPercent || 0,
          prevPortfolioWeight: holder.portfolioPercent || 0
        }));

        setData(formatted);
      } catch (err) {
        console.error('Error fetching stock ownership:', err);
        setError('Failed to load stock ownership data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [ticker]);

  return { data, loading, error };
};

// Helper functions
const formatLargeNumber = (num: number): string => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
  return num.toLocaleString();
};

const formatCurrency = (num: number): string => {
  if (num >= 1e12) return '$' + (num / 1e12).toFixed(2) + ' T';
  if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + ' M';
  return '$' + num.toLocaleString();
};

const formatShareCount = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + ' B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + ' K';
  return num.toLocaleString();
};

const formatShareChange = (num: number): string => {
  const formatted = formatShareCount(Math.abs(num));
  return num < 0 ? '-' + formatted : formatted;
};