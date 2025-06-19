import React, { useState } from 'react';
import { Building2, Users, RefreshCw, Download, Settings, Maximize2, Filter, Calendar } from 'lucide-react';
import classNames from 'classnames';

interface OwnershipPageProps {
  ticker: string;
}

interface InstitutionalData {
  metric: string;
  currentQuarter: string | number;
  pastQuarter: string | number;
  change: string | number;
  percentageChange: string | number;
  isPositive?: boolean;
}

interface StockOwnershipData {
  investorName: string;
  investmentDiscretion: 'SOLE' | 'DFND' | 'OTR';
  sharesHeld: string;
  changeInShares: string;
  percentageChange: number;
  marketValue: string;
  portfolioWeight: number;
  prevPortfolioWeight: number;
}

const OwnershipPage: React.FC<OwnershipPageProps> = ({ ticker }) => {
  const [activeTab, setActiveTab] = useState<'institutional' | 'stock'>('institutional');
  const selectedDate = '2025';
  const selectedQuarter = 'Q1 Q2 Q3 Q4';

  const institutionalData: InstitutionalData[] = [
    { metric: 'Investors Holding', currentQuarter: '5,709', pastQuarter: '5,815', change: '-106', percentageChange: '-0.02', isPositive: false },
    { metric: 'Number Of Shares', currentQuarter: '9.41 B', pastQuarter: '9.11 B', change: '301.30 M', percentageChange: '0.03', isPositive: true },
    { metric: 'Total Invested', currentQuarter: '2.03 T', pastQuarter: '2.35 T', change: '-319.84 B', percentageChange: '-0.14', isPositive: false },
    { metric: 'Ownership Percent', currentQuarter: '61.00', pastQuarter: '62.42', change: '-1.41', percentageChange: '-0.02', isPositive: false },
    { metric: 'New Positions', currentQuarter: '158', pastQuarter: '716', change: '-558', percentageChange: '-0.78', isPositive: false },
    { metric: 'Increased Positions', currentQuarter: '2,149', pastQuarter: '2,702', change: '-553', percentageChange: '-0.20', isPositive: false },
    { metric: 'Closed Positions', currentQuarter: '271', pastQuarter: '197', change: '74', percentageChange: '0.38', isPositive: true },
    { metric: 'Reduced Positions', currentQuarter: '3,034', pastQuarter: '2,588', change: '446', percentageChange: '0.17', isPositive: true },
    { metric: 'Total Calls', currentQuarter: '163.35 M', pastQuarter: '206.24 M', change: '-42.89 M', percentageChange: '-0.21', isPositive: false },
    { metric: 'Total Puts', currentQuarter: '153.76 M', pastQuarter: '249.68 M', change: '-95.81 M', percentageChange: '-0.38', isPositive: false },
    { metric: 'Put/Call Ratio', currentQuarter: '0.94', pastQuarter: '1.21', change: '-0.27', percentageChange: '-0.22', isPositive: false },
  ];

  const stockOwnershipData: StockOwnershipData[] = [
    { investorName: 'Rhumbline Advisers', investmentDiscretion: 'SOLE', sharesHeld: '28.38 M', changeInShares: '-577,802', percentageChange: -2.00, marketValue: '7.11 B', portfolioWeight: 6.36, prevPortfolioWeight: 6.36 },
    { investorName: 'Morgan Stanley', investmentDiscretion: 'DFND', sharesHeld: '238.26 M', changeInShares: '6.80 M', percentageChange: 2.94, marketValue: '59.67 B', portfolioWeight: 4.18, prevPortfolioWeight: 4.18 },
    { investorName: 'California Public Employees Retirement System', investmentDiscretion: 'SOLE', sharesHeld: '39.81 M', changeInShares: '796,247', percentageChange: 2.04, marketValue: '9.97 B', portfolioWeight: 6.67, prevPortfolioWeight: 6.67 },
    { investorName: 'Raymond James Financial INC', investmentDiscretion: 'DFND', sharesHeld: '29.76 M', changeInShares: '29.76 M', percentageChange: 100, marketValue: '7.45 B', portfolioWeight: 2.75, prevPortfolioWeight: 2.75 },
    { investorName: 'State Street Corp', investmentDiscretion: 'DFND', sharesHeld: '595.50 M', changeInShares: '11.49 M', percentageChange: 1.97, marketValue: '149.13 B', portfolioWeight: 5.88, prevPortfolioWeight: 5.88 },
    { investorName: 'Berkshire Hathaway INC', investmentDiscretion: 'DFND', sharesHeld: '300.00 M', changeInShares: '0', percentageChange: 0, marketValue: '75.13 B', portfolioWeight: 28.12, prevPortfolioWeight: 28.12 },
    { investorName: 'Price T Rowe Associates INC /MD/', investmentDiscretion: 'SOLE', sharesHeld: '220.11 M', changeInShares: '-15.47 M', percentageChange: -6.57, marketValue: '55.12 B', portfolioWeight: 6.35, prevPortfolioWeight: 6.35 },
    { investorName: 'Northern Trust Corp', investmentDiscretion: 'OTR', sharesHeld: '171.39 M', changeInShares: '20.08 M', percentageChange: 13.27, marketValue: '42.92 B', portfolioWeight: 6.08, prevPortfolioWeight: 6.08 },
    { investorName: 'Bank OF America Corp /DE/', investmentDiscretion: 'DFND', sharesHeld: '118.79 M', changeInShares: '75.33 M', percentageChange: 173.37, marketValue: '29.75 B', portfolioWeight: 2.50, prevPortfolioWeight: 2.50 },
  ];


  const getChangeColor = (value: number | string, isPositive?: boolean): string => {
    if (typeof value === 'string' && value.includes('-')) return 'text-openbb-danger';
    if (typeof value === 'number' && value < 0) return 'text-openbb-danger';
    if (isPositive === false && value !== 0) return 'text-openbb-danger';
    if (isPositive === true || (typeof value === 'number' && value > 0)) return 'text-openbb-success';
    return 'text-openbb-text-primary';
  };

  return (
    <div className="h-full bg-openbb-bg-primary">
      {/* Tab Selector */}
      <div className="flex gap-4 p-4">
        <div 
          className={classNames(
            "bg-openbb-bg-widget rounded border border-openbb-border cursor-pointer",
            activeTab === 'institutional' ? 'border-openbb-accent' : ''
          )}
          onClick={() => setActiveTab('institutional')}
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-openbb-accent" />
              <h3 className="text-sm font-mono font-semibold text-openbb-text-primary">Institutional Ownership</h3>
            </div>
            <p className="text-xs text-openbb-text-muted font-mono">Track institutional holdings</p>
          </div>
        </div>

        <div 
          className={classNames(
            "bg-openbb-bg-widget rounded border border-openbb-border cursor-pointer",
            activeTab === 'stock' ? 'border-openbb-accent' : ''
          )}
          onClick={() => setActiveTab('stock')}
        >
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-openbb-accent" />
              <h3 className="text-sm font-mono font-semibold text-openbb-text-primary">Stock Ownership</h3>
            </div>
            <p className="text-xs text-openbb-text-muted font-mono">Individual stock holders</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'institutional' && (
        <div className="px-4 pb-4">
          <div className="bg-openbb-bg-widget rounded border border-openbb-border">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-mono font-semibold text-openbb-text-primary">Institutional Ownership</h2>
                <span className="bg-openbb-blue text-white px-2 py-0.5 rounded text-xs font-mono">
                  {ticker} → {selectedDate}
                </span>
                <span className="text-xs font-mono text-openbb-text-muted">
                  {selectedQuarter}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <RefreshCw size={14} />
                </button>
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <Download size={14} />
                </button>
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <Settings size={14} />
                </button>
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-openbb-bg-secondary border-b border-openbb-border">
                    <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Index</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Current Quarter</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Past Quarter</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Change</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Percentage Change</th>
                  </tr>
                </thead>
                <tbody>
                  {institutionalData.map((row, index) => (
                    <tr
                      key={row.metric}
                      className={classNames(
                        'hover:bg-openbb-bg-hover transition-colors border-b border-openbb-border/30',
                        index % 2 === 0 ? '' : 'bg-openbb-bg-secondary/10'
                      )}
                    >
                      <td className="py-2.5 px-4 text-openbb-text-primary">{row.metric}</td>
                      <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.currentQuarter}</td>
                      <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.pastQuarter}</td>
                      <td className={classNames(
                        "text-center py-2.5 px-4",
                        getChangeColor(row.change, row.isPositive)
                      )}>
                        {row.change}
                      </td>
                      <td className={classNames(
                        "text-center py-2.5 px-4",
                        getChangeColor(row.percentageChange, row.isPositive)
                      )}>
                        {row.percentageChange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-openbb-border bg-openbb-bg-secondary">
              <p className="text-xxs text-openbb-text-muted font-mono">
                Current Currency: USD
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="px-4 pb-4">
          <div className="bg-openbb-bg-widget rounded border border-openbb-border">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-mono font-semibold text-openbb-text-primary">Stock Ownership</h2>
                <span className="bg-openbb-blue text-white px-2 py-0.5 rounded text-xs font-mono flex items-center gap-1">
                  {ticker} → Mar 17, 2025
                  <Calendar size={12} />
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <RefreshCw size={14} />
                </button>
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <Download size={14} />
                </button>
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <Filter size={14} />
                </button>
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <Settings size={14} />
                </button>
                <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                  <Maximize2 size={14} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto" style={{ height: 'calc(100vh - 400px)' }}>
              <table className="w-full text-xs font-mono">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-openbb-bg-secondary border-b border-openbb-border">
                    <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Investor Name</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Investment Discretion</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Shares Held</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Change in Shares</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Percentage Change [%]</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Market Value</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Portfolio Weight [%]</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Prev Portfolio Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {stockOwnershipData.map((row, index) => (
                    <tr
                      key={row.investorName}
                      className={classNames(
                        'hover:bg-openbb-bg-hover transition-colors border-b border-openbb-border/30',
                        index % 2 === 0 ? '' : 'bg-openbb-bg-secondary/10'
                      )}
                    >
                      <td className="py-2.5 px-4 text-openbb-text-primary">{row.investorName}</td>
                      <td className="text-center py-2.5 px-4">
                        <span className={classNames(
                          "px-2 py-0.5 rounded text-xxs",
                          row.investmentDiscretion === 'SOLE' ? 'bg-openbb-blue/20 text-openbb-blue' :
                          row.investmentDiscretion === 'DFND' ? 'bg-openbb-warning/20 text-openbb-warning' :
                          'bg-openbb-accent/20 text-openbb-accent'
                        )}>
                          {row.investmentDiscretion}
                        </span>
                      </td>
                      <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.sharesHeld}</td>
                      <td className={classNames(
                        "text-center py-2.5 px-4",
                        getChangeColor(row.changeInShares)
                      )}>
                        {row.changeInShares}
                      </td>
                      <td className={classNames(
                        "text-center py-2.5 px-4",
                        getChangeColor(row.percentageChange)
                      )}>
                        {row.percentageChange.toFixed(2)}
                      </td>
                      <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.marketValue}</td>
                      <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.portfolioWeight.toFixed(2)}</td>
                      <td className="text-center py-2.5 px-4 text-openbb-text-muted">{row.prevPortfolioWeight.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnershipPage;