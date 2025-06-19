import React, { useState } from 'react';
import { RefreshCw, Download, Settings, Maximize2 } from 'lucide-react';
import classNames from 'classnames';
import { useFinancialStatementsRealTime } from '../../hooks/useRealTimeDataExtended';

interface FinancialsPageProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
}

type StatementType = 'income' | 'balance' | 'cashflow';
type ViewType = 'FY' | 'QTR';

const FinancialsPage: React.FC<FinancialsPageProps> = ({ ticker }) => {
  const [statementType, setStatementType] = useState<StatementType>('income');
  const [viewType, setViewType] = useState<ViewType>('FY');

  // Convert FY/QTR to API format
  const periodMapping = {
    'FY': 'annual',
    'QTR': 'quarter'
  } as const;

  const apiPeriod = periodMapping[viewType];
  
  // Fetch real-time financial data
  const { data: rawFinancialData, isLoading, error } = useFinancialStatementsRealTime(
    ticker, 
    statementType, 
    apiPeriod
  );

  // Transform API data to match component format
  const transformFinancialData = (data: any[]) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {};
    }

    // Get years from the data
    const years = data.map(item => {
      const date = new Date(item.date || item.calendarYear);
      return date.getFullYear().toString();
    }).slice(0, 10); // Limit to 10 years

    // Transform based on statement type
    const transformedData: { [key: string]: (string | number)[] } = {};
    
    if (statementType === 'income') {
      // Income Statement fields
      const fields = [
        { key: 'Revenue', apiKey: 'revenue' },
        { key: 'Cost Of Revenue', apiKey: 'costOfRevenue' },
        { key: 'Gross Profit', apiKey: 'grossProfit' },
        { key: 'Gross Profit Margin', apiKey: 'grossProfitRatio' },
        { key: 'Research And Development Ex...', apiKey: 'researchAndDevelopmentExpenses' },
        { key: 'Selling General And Administra...', apiKey: 'sellingGeneralAndAdministrativeExpenses' },
        { key: 'Operating Expenses', apiKey: 'operatingExpenses' },
        { key: 'Cost And Expenses', apiKey: 'costAndExpenses' },
        { key: 'Depreciation And Amortization', apiKey: 'depreciationAndAmortization' },
        { key: 'EBITDA', apiKey: 'ebitda' },
        { key: 'EBITDA Ratio', apiKey: 'ebitdaratio' },
        { key: 'Operating Income', apiKey: 'operatingIncome' },
        { key: 'Operating Income Margin', apiKey: 'operatingIncomeRatio' },
        { key: 'Total Other Income Expenses ...', apiKey: 'totalOtherIncomeExpensesNet' },
        { key: 'Income Before Tax', apiKey: 'incomeBeforeTax' },
        { key: 'Income Before Tax Margin', apiKey: 'incomeBeforeTaxRatio' },
        { key: 'Income Tax Expense', apiKey: 'incomeTaxExpense' },
        { key: 'Net Income', apiKey: 'netIncome' },
        { key: 'Net Income Margin', apiKey: 'netIncomeRatio' },
        { key: 'Earnings Per Share', apiKey: 'eps' },
        { key: 'Earnings Per Share Diluted', apiKey: 'epsdiluted' },
      ];

      fields.forEach(field => {
        transformedData[field.key] = data.map(item => {
          let value = item[field.apiKey];
          
          // Handle percentage fields
          if (field.key.includes('Margin') || field.key.includes('Ratio')) {
            return typeof value === 'number' ? `${(value * 100).toFixed(3)} %` : `${(parseFloat(value || 0) * 100).toFixed(3)} %`;
          }
          
          return value || 0;
        });
      });
    } else if (statementType === 'balance') {
      // Balance Sheet fields
      const fields = [
        { key: 'Total Assets', apiKey: 'totalAssets' },
        { key: 'Total Current Assets', apiKey: 'totalCurrentAssets' },
        { key: 'Cash And Cash Equivalents', apiKey: 'cashAndCashEquivalents' },
        { key: 'Short Term Investments', apiKey: 'shortTermInvestments' },
        { key: 'Total Liabilities', apiKey: 'totalLiabilities' },
        { key: 'Total Current Liabilities', apiKey: 'totalCurrentLiabilities' },
        { key: 'Total Shareholder Equity', apiKey: 'totalStockholdersEquity' },
      ];

      fields.forEach(field => {
        transformedData[field.key] = data.map(item => item[field.apiKey] || 0);
      });
    } else if (statementType === 'cashflow') {
      // Cash Flow Statement fields
      const fields = [
        { key: 'Operating Cash Flow', apiKey: 'operatingCashFlow' },
        { key: 'Investing Cash Flow', apiKey: 'netCashUsedForInvestingActivites' },
        { key: 'Financing Cash Flow', apiKey: 'netCashUsedProvidedByFinancingActivities' },
        { key: 'Free Cash Flow', apiKey: 'freeCashFlow' },
        { key: 'Net Change In Cash', apiKey: 'netChangeInCash' },
      ];

      fields.forEach(field => {
        transformedData[field.key] = data.map(item => item[field.apiKey] || 0);
      });
    }

    return transformedData;
  };

  const financialData = transformFinancialData(rawFinancialData || []);
  const years = rawFinancialData?.map(item => {
    const date = new Date(item.date || item.calendarYear);
    return date.getFullYear().toString();
  }).slice(0, 10) || ['2024', '2023', '2022', '2021', '2020', '2019', '2018'];

  // Fallback mock data structure
  const mockFinancialData = {
    income: {
    'Revenue': [391035, 383285, 394328, 365817, 274515, 260174, 265595, 229234, 215639, 233715],
    'Cost Of Revenue': [210352, 214137, 223546, 212981, 169559, 161782, 163756, 141048, 131376, 140089],
    'Gross Profit': [180683, 169148, 170782, 152836, 104956, 98392, 101839, 88186, 84263, 93626],
    'Gross Profit Margin': ['46.206 %', '44.131 %', '43.309 %', '41.779 %', '38.233 %', '37.817 %', '38.343 %', '38.469 %', '39.075 %', '40.089 %'],
    'Research And Development Ex...': [31370, 29915, 26251, 21914, 18752, 16217, 14236, 11581, 10045, 8067],
    'Selling General And Administra...': [26097, 24932, 25094, 21973, 19916, 18245, 16705, 15261, 14194, 14329],
    'Operating Expenses': [57467, 54847, 51345, 43887, 38668, 34462, 30941, 26842, 24239, 22396],
    'Cost And Expenses': [267819, 268984, 274891, 256868, 208227, 196244, 194697, 167890, 155615, 162485],
    'Depreciation And Amortization': [11445, 11519, 11104, 11284, 11056, 12547, 10903, 8400, 9800, 11257],
    'EBITDA': [134661, 125820, 130541, 123136, 81020, 76711, 87046, 76812, 72628, 84748],
    'EBITDA Ratio': ['34.437 %', '32.826 %', '33.104 %', '33.660 %', '29.513 %', '31.463 %', '32.773 %', '33.504 %', '33.680 %', '35.883 %'],
    'Operating Income': [123216, 114301, 119437, 108949, 66288, 63930, 70898, 61344, 60024, 71230],
    'Operating Income Margin': ['31.510 %', '29.824 %', '30.288 %', '29.782 %', '24.147 %', '24.572 %', '26.694 %', '26.760 %', '27.835 %', '30.477 %'],
    'Total Other Income Expenses ...': [269, -565, -334, 258, 803, 1807, 2005, 2745, 1348, 1285],
    'Income Before Tax': [123485, 113736, 119103, 109207, 67091, 65737, 72903, 64089, 61372, 72515],
    'Income Before Tax Margin': ['31.579 %', '29.674 %', '30.204 %', '29.852 %', '24.438 %', '25.266 %', '27.448 %', '27.957 %', '28.460 %', '31.027 %'],
    'Income Tax Expense': [29749, 16741, 19300, 14527, 9680, 10481, 13372, 15738, 15685, 19121],
    'Net Income': [93736, 96995, 99803, 94680, 57411, 55256, 59531, 48351, 45687, 53394],
    'Net Income Margin': ['23.971 %', '25.306 %', '25.309 %', '25.881 %', '20.913 %', '21.238 %', '22.414 %', '21.092 %', '21.186 %', '22.845 %'],
    'Earnings Per Share': [6.110, 6.160, 6.150, 5.670, 3.310, 2.990, 3, 2.320, 2.090, 2.320],
    'Earnings Per Share Diluted': [6.080, 6.130, 6.110, 5.610, 3.280, 2.970, 2.980, 2.300, 2.080, 2.300],
    },
    balance: {
      'Total Assets': [353514, 352755, 352755, 351002, 323888, 338516, 365725, 375319, 321686, 293064],
      'Total Current Assets': [128645, 135405, 135405, 134836, 143713, 162819, 140828, 128645, 106869, 94998],
      'Cash And Cash Equivalents': [28995, 28408, 23646, 34940, 38016, 48844, 20289, 20484, 21120, 13844],
      'Short Term Investments': [29880, 27565, 24658, 27699, 52927, 51713, 40388, 53892, 46671, 20481],
      'Total Liabilities': [288427, 290437, 302083, 287912, 258549, 248028, 258578, 241272, 200450, 183052],
      'Total Current Liabilities': [124689, 133973, 153982, 125481, 105392, 105718, 116866, 100814, 83553, 71147],
      'Total Shareholder Equity': [65066, 62447, 50672, 63090, 65339, 90488, 107147, 134047, 120251, 110012],
    },
    cashflow: {
      'Operating Cash Flow': [110563, 99584, 122151, 104038, 80674, 69391, 77434, 63598, 65824, 81266],
      'Investing Cash Flow': [-3831, -3705, 22354, -14545, -4289, 45896, -16066, -46446, -45977, -56274],
      'Financing Cash Flow': [-106550, -103510, -103829, -93353, -86820, -90976, -87876, -17974, -20483, -17716],
      'Free Cash Flow': [99314, 89095, 111443, 92953, 73365, 58896, 64383, 51774, 53226, 70017],
      'Net Change In Cash': [410, -5771, -11338, -3941, -10435, 28530, -5195, 636, 7276, -1844],
    },
  };

  const getData = () => {
    // Use real-time data if available, otherwise fallback to mock data
    if (Object.keys(financialData).length > 0) {
      return financialData;
    }
    
    // Fallback to mock data
    switch (statementType) {
      case 'balance':
        return mockFinancialData.balance;
      case 'cashflow':
        return mockFinancialData.cashflow;
      default:
        return mockFinancialData.income;
    }
  };

  const isHighlightedRow = (key: string) => {
    const highlightedRows = [
      'Revenue', 'Gross Profit', 'Operating Income', 'Net Income',
      'Total Assets', 'Total Liabilities', 'Total Shareholder Equity',
      'Operating Cash Flow', 'Free Cash Flow'
    ];
    return highlightedRows.includes(key);
  };

  const formatValue = (key: string, value: string | number) => {
    if (typeof value === 'string') return value;
    
    // Format percentage rows
    if (key.includes('Margin') || key.includes('Ratio') || key.includes('%')) {
      return `${value.toFixed(3)} %`;
    }
    
    // Format per share values
    if (key.includes('Per Share')) {
      return value.toFixed(3);
    }
    
    // Format regular numbers with thousand separators
    return value.toLocaleString();
  };

  const statementButtons = [
    { id: 'income', label: 'Income Statement' },
    { id: 'balance', label: 'Balance Sheet' },
    { id: 'cashflow', label: 'Cash Flow Statement' },
  ];

  // For now, use mock data and indicate it's demo data

  // Show loading state briefly, then proceed with available data
  if (isLoading && !rawFinancialData) {
    return (
      <div className="h-full bg-openbb-bg-primary">
        <div className="h-full bg-openbb-bg-widget border border-openbb-border flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openbb-accent mx-auto mb-4"></div>
            <p className="text-openbb-text-muted font-mono text-sm">Loading financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-openbb-bg-primary">
      <div className="h-full bg-openbb-bg-widget border border-openbb-border">
        <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-mono font-semibold text-openbb-text-primary">Financial Statements</h2>
            {rawFinancialData && rawFinancialData.length > 0 ? (
              <span className="text-xs text-openbb-accent font-mono bg-openbb-bg-hover px-2 py-1 rounded">LIVE</span>
            ) : (
              <span className="text-xs text-yellow-500 font-mono bg-openbb-bg-hover px-2 py-1 rounded">DEMO</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Type Selector */}
            <div className="flex items-center gap-1 bg-openbb-bg-secondary p-0.5 rounded">
              {(['FY', 'QTR'] as ViewType[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setViewType(view)}
                  className={classNames(
                    'px-3 py-1 text-xs font-mono rounded transition-colors',
                    viewType === view
                      ? 'bg-openbb-accent text-openbb-bg-primary'
                      : 'text-openbb-text-secondary hover:text-openbb-text-primary'
                  )}
                >
                  {view}
                </button>
              ))}
            </div>

            {/* Statement Type Buttons */}
            <div className="flex items-center gap-1">
              {statementButtons.map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setStatementType(btn.id as StatementType)}
                  className={classNames(
                    'px-3 py-1 text-xs font-mono rounded transition-colors',
                    statementType === btn.id
                      ? 'bg-openbb-accent text-openbb-bg-primary'
                      : 'text-openbb-text-secondary hover:text-openbb-text-primary hover:bg-openbb-bg-hover'
                  )}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 ml-4">
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
        </div>

        {/* Statement Table */}
        <div className="overflow-auto" style={{ height: 'calc(100vh - 200px)' }}>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-openbb-border bg-openbb-bg-secondary">
                <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium sticky left-0 bg-openbb-bg-secondary z-10 border-r border-openbb-border">
                  Index
                </th>
                {years.map((year) => (
                  <th key={year} className="text-right py-3 px-4 text-openbb-text-secondary font-medium min-w-[100px]">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(getData()).map(([key, values], index) => (
                <tr
                  key={key}
                  className={classNames(
                    'hover:bg-openbb-bg-hover transition-colors',
                    index % 2 === 0 ? '' : 'bg-openbb-bg-secondary/20'
                  )}
                >
                  <td className={classNames(
                    "py-2.5 px-4 sticky left-0 bg-inherit z-10 border-r border-openbb-border whitespace-nowrap",
                    isHighlightedRow(key) ? "text-openbb-accent font-semibold" : "text-openbb-text-primary"
                  )}>
                    {key}
                  </td>
                  {values.map((value, idx) => (
                    <td key={idx} className={classNames(
                      "text-right py-2.5 px-4 min-w-[100px]",
                      isHighlightedRow(key) ? "text-openbb-accent font-semibold" : "text-openbb-text-primary",
                      typeof value === 'number' && value < 0 ? "text-openbb-danger" : ""
                    )}>
                      {formatValue(key, value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-openbb-border bg-openbb-bg-secondary">
          <p className="text-xxs text-openbb-text-muted font-mono">
            Note: Millions of USD except Per Share Values
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialsPage;