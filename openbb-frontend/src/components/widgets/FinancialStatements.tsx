import React, { useState } from 'react';
import { RefreshCw, Download, Settings, Maximize2 } from 'lucide-react';
import classNames from 'classnames';
import { useFinancialStatementsRealTime } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';

interface FinancialStatementsProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

type StatementType = 'income' | 'balance' | 'cashflow';
type ViewType = 'FY' | 'QTR';

const FinancialStatements: React.FC<FinancialStatementsProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
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

  const { addWidgetContext } = useCopilot();

  // CIK mapping for common tickers (used when mock data is shown)
  const tickerToCIK: { [key: string]: string } = {
    'AAPL': '0000320193',
    'MSFT': '0000789019',
    'GOOGL': '0001652044',
    'AMZN': '0001018724',
    'META': '0001326801',
    'TSLA': '0001318605',
    'NVDA': '0001045810',
    'JPM': '0000019617',
    'V': '0001403161',
    'JNJ': '0000200406',
    'WMT': '0000104169',
    'PG': '0000080424',
    'MA': '0001141391',
    'HD': '0000354950',
    'DIS': '0001744489',
    'ADBE': '0000796343',
    'NFLX': '0001065280',
    'CRM': '0001108524',
    'PFE': '0000078003',
    'CSCO': '0000858877',
  };

  // Get SEC filing link from the financial data itself
  const getSecFilingLink = () => {
    if (rawFinancialData && rawFinancialData.length > 0) {
      // Use finalLink if available, otherwise use link
      return rawFinancialData[0].finalLink || rawFinancialData[0].link || null;
    }
    return null;
  };

  // Get CIK for current ticker
  const getCIK = () => {
    if (rawFinancialData && rawFinancialData.length > 0 && rawFinancialData[0].cik) {
      return rawFinancialData[0].cik;
    }
    return tickerToCIK[ticker] || '';
  };

  // Transform API data to match component format
  const transformFinancialData = (data: any[]) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return {};
    }

    // Get years from the data - use all available data
    const years = data.map(item => {
      const date = new Date(item.date || item.calendarYear);
      return date.getFullYear().toString();
    });

    // Transform based on statement type
    const transformedData: { [key: string]: (string | number)[] } = {};
    
    if (statementType === 'income') {
      // Income Statement fields - Exact match to OpenBB platform
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
      // Balance Sheet fields - Standard OpenBB format
      const fields = [
        { key: 'Cash And Cash Equivalents', apiKey: 'cashAndCashEquivalents' },
        { key: 'Short Term Investments', apiKey: 'shortTermInvestments' },
        { key: 'Net Receivables', apiKey: 'netReceivables' },
        { key: 'Inventory', apiKey: 'inventory' },
        { key: 'Other Current Assets', apiKey: 'otherCurrentAssets' },
        { key: 'Total Current Assets', apiKey: 'totalCurrentAssets' },
        { key: 'Property Plant Equipment Net', apiKey: 'propertyPlantEquipmentNet' },
        { key: 'Goodwill', apiKey: 'goodwill' },
        { key: 'Intangible Assets', apiKey: 'intangibleAssets' },
        { key: 'Long Term Investments', apiKey: 'longTermInvestments' },
        { key: 'Other Non Current Assets', apiKey: 'otherNonCurrentAssets' },
        { key: 'Total Non Current Assets', apiKey: 'totalNonCurrentAssets' },
        { key: 'Total Assets', apiKey: 'totalAssets' },
        { key: 'Accounts Payable', apiKey: 'accountsPayable' },
        { key: 'Short Term Debt', apiKey: 'shortTermDebt' },
        { key: 'Tax Payable', apiKey: 'taxPayable' },
        { key: 'Deferred Revenue', apiKey: 'deferredRevenue' },
        { key: 'Other Current Liabilities', apiKey: 'otherCurrentLiabilities' },
        { key: 'Total Current Liabilities', apiKey: 'totalCurrentLiabilities' },
        { key: 'Long Term Debt', apiKey: 'longTermDebt' },
        { key: 'Deferred Revenue Non Current', apiKey: 'deferredRevenueNonCurrent' },
        { key: 'Deferred Tax Liabilities Non Current', apiKey: 'deferredTaxLiabilitiesNonCurrent' },
        { key: 'Other Non Current Liabilities', apiKey: 'otherNonCurrentLiabilities' },
        { key: 'Total Non Current Liabilities', apiKey: 'totalNonCurrentLiabilities' },
        { key: 'Total Liabilities', apiKey: 'totalLiabilities' },
        { key: 'Preferred Stock', apiKey: 'preferredStock' },
        { key: 'Common Stock', apiKey: 'commonStock' },
        { key: 'Retained Earnings', apiKey: 'retainedEarnings' },
        { key: 'Accumulated Other Comprehensive Income Loss', apiKey: 'accumulatedOtherComprehensiveIncomeLoss' },
        { key: 'Other Total Stockholders Equity', apiKey: 'othertotalStockholdersEquity' },
        { key: 'Total Stockholders Equity', apiKey: 'totalStockholdersEquity' },
        { key: 'Total Liabilities And Stockholders Equity', apiKey: 'totalLiabilitiesAndStockholdersEquity' },
      ];

      fields.forEach(field => {
        transformedData[field.key] = data.map(item => item[field.apiKey] || 0);
      });
    } else if (statementType === 'cashflow') {
      // Cash Flow Statement fields - Standard OpenBB format
      const fields = [
        { key: 'Net Income', apiKey: 'netIncome' },
        { key: 'Depreciation And Amortization', apiKey: 'depreciationAndAmortization' },
        { key: 'Deferred Income Tax', apiKey: 'deferredIncomeTax' },
        { key: 'Stock Based Compensation', apiKey: 'stockBasedCompensation' },
        { key: 'Change In Working Capital', apiKey: 'changeInWorkingCapital' },
        { key: 'Accounts Receivables', apiKey: 'accountsReceivables' },
        { key: 'Inventory', apiKey: 'inventory' },
        { key: 'Accounts Payables', apiKey: 'accountsPayables' },
        { key: 'Other Working Capital', apiKey: 'otherWorkingCapital' },
        { key: 'Other Non Cash Items', apiKey: 'otherNonCashItems' },
        { key: 'Net Cash Provided By Operating Activities', apiKey: 'netCashProvidedByOperatingActivities' },
        { key: 'Investments In Property Plant And Equipment', apiKey: 'investmentsInPropertyPlantAndEquipment' },
        { key: 'Acquisitions Net', apiKey: 'acquisitionsNet' },
        { key: 'Purchases Of Investments', apiKey: 'purchasesOfInvestments' },
        { key: 'Sales Maturities Of Investments', apiKey: 'salesMaturitiesOfInvestments' },
        { key: 'Other Investing Activities', apiKey: 'otherInvestingActivites' },
        { key: 'Net Cash Used For Investing Activities', apiKey: 'netCashUsedForInvestingActivites' },
        { key: 'Debt Repayment', apiKey: 'debtRepayment' },
        { key: 'Common Stock Issued', apiKey: 'commonStockIssued' },
        { key: 'Common Stock Repurchased', apiKey: 'commonStockRepurchased' },
        { key: 'Dividends Paid', apiKey: 'dividendsPaid' },
        { key: 'Other Financing Activities', apiKey: 'otherFinancingActivites' },
        { key: 'Net Cash Used Provided By Financing Activities', apiKey: 'netCashUsedProvidedByFinancingActivities' },
        { key: 'Effect Of Forex Changes On Cash', apiKey: 'effectOfForexChangesOnCash' },
        { key: 'Net Change In Cash', apiKey: 'netChangeInCash' },
        { key: 'Cash At End Of Period', apiKey: 'cashAtEndOfPeriod' },
        { key: 'Cash At Beginning Of Period', apiKey: 'cashAtBeginningOfPeriod' },
        { key: 'Operating Cash Flow', apiKey: 'operatingCashFlow' },
        { key: 'Capital Expenditure', apiKey: 'capitalExpenditure' },
        { key: 'Free Cash Flow', apiKey: 'freeCashFlow' },
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
    // For quarterly data, show Q + year format
    if (apiPeriod === 'quarter' && item.period && item.period.startsWith('Q')) {
      return `${item.period} ${date.getFullYear()}`;
    }
    return date.getFullYear().toString();
  }) || ['2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017', '2016', '2015'];

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
      'Cash And Cash Equivalents': [28995, 28408, 23646, 34940, 38016, 48844, 20289, 20484, 21120, 13844],
      'Short Term Investments': [29880, 27565, 24658, 27699, 52927, 51713, 40388, 53892, 46671, 20481],
      'Net Receivables': [22926, 21223, 18936, 20816, 14873, 13717, 15754, 14348, 13102, 11556],
      'Inventory': [6331, 4946, 4061, 4061, 2132, 2349, 2349, 2132, 1764, 1051],
      'Other Current Assets': [14695, 14111, 11264, 11264, 12352, 8283, 8395, 7839, 8283, 8544],
      'Total Current Assets': [128645, 135405, 135405, 134836, 143713, 162819, 140828, 128645, 106869, 94998],
      'Property Plant Equipment Net': [43715, 42117, 39440, 37378, 27010, 22471, 20624, 16597, 15452, 14329],
      'Long Term Investments': [120805, 120805, 127877, 100887, 100887, 194714, 194714, 170430, 130162, 130162],
      'Other Non Current Assets': [60458, 54428, 49849, 78097, 32978, 22283, 10162, 8757, 5146, 3764],
      'Total Non Current Assets': [224978, 217350, 217166, 216262, 180175, 175697, 224897, 246674, 214817, 198066],
      'Total Assets': [353623, 352755, 352571, 351098, 323888, 338516, 365725, 375319, 321686, 293064],
      'Accounts Payable': [54763, 64115, 54763, 54763, 32589, 35490, 37294, 35490, 30196, 25181],
      'Short Term Debt': [9822, 9613, 9982, 11128, 10260, 8784, 11605, 6496, 10999, 5516],
      'Deferred Revenue': [8061, 7912, 7612, 6759, 5522, 4853, 4091, 3624, 3031, 2625],
      'Other Current Liabilities': [51506, 60845, 51506, 51506, 37720, 33473, 33473, 28461, 24689, 22952],
      'Total Current Liabilities': [124152, 142575, 123863, 123856, 86091, 82600, 86363, 74071, 68915, 56274],
      'Long Term Debt': [95281, 98959, 98662, 109106, 91807, 75427, 75427, 53463, 53329, 28987],
      'Other Non Current Liabilities': [68845, 48849, 79422, 54937, 80680, 89839, 96818, 113718, 58205, 87495],
      'Total Non Current Liabilities': [164126, 147808, 178084, 164043, 172487, 165266, 172245, 167181, 111534, 116482],
      'Total Liabilities': [288278, 290383, 301947, 287899, 258578, 247866, 258608, 241252, 180449, 172756],
      'Common Stock': [73812, 67010, 63090, 57365, 50779, 45174, 42543, 35867, 31251, 27416],
      'Retained Earnings': [18495, 1101, -3068, -214, 45898, 45898, 87152, 98330, 104256, 92284],
      'Accumulated Other Comprehensive Income Loss': [-962, -4962, -11109, 163, -11249, -584, -406, 150, 634, 1082],
      'Other Total Stockholders Equity': [-28420, -548, 1520, 5884, -21021, -1794, -22442, -599, 5096, -358],
      'Total Stockholders Equity': [62925, 62601, 50433, 63198, 65407, 90694, 107117, 134067, 141237, 120424],
      'Total Liabilities And Stockholders Equity': [351203, 352984, 352380, 351097, 323985, 338560, 365725, 375319, 321686, 293180],
    },
    cashflow: {
      'Net Income': [93736, 96995, 99803, 94680, 57411, 55256, 59531, 48351, 45687, 53394],
      'Depreciation And Amortization': [11445, 11519, 11104, 11284, 11056, 12547, 10903, 8400, 9800, 11257],
      'Deferred Income Tax': [-1380, 895, 1198, 2081, 776, -635, 2938, 4938, 2406, 1141],
      'Stock Based Compensation': [10833, 9038, 7906, 7974, 6829, 5716, 4840, 3938, 3586, 2863],
      'Change In Working Capital': [1708, -7085, -4911, 12326, 4751, -2081, 4140, 4213, 5318, 5856],
      'Accounts Receivables': [-1688, -1823, 2137, -6917, -2142, -484, 527, -2093, -1833, -2142],
      'Inventory': [1385, 1484, 0, 1929, -217, 238, 217, 368, 713, 1051],
      'Accounts Payables': [9689, 9363, 2648, 9101, 7612, 7612, 2648, 4052, 5015, 2203],
      'Other Working Capital': [-7678, -16109, -9696, 8213, -905, -9447, 748, 1886, 1423, 4744],
      'Other Non Cash Items': [763, 111, -147, 147, -570, 57, -166, 299, 445, 1051],
      'Net Cash Provided By Operating Activities': [116615, 111443, 118224, 104038, 80674, 69391, 77434, 63598, 65824, 81266],
      'Investments In Property Plant And Equipment': [-10959, -7709, -11085, -7309, -7027, -12734, -12451, -13313, -9813, -10495],
      'Purchases Of Investments': [-22810, -76923, -109689, -142428, -56274, -142428, -199665, -109689, -166402, -156710],
      'Sales Maturities Of Investments': [29213, 106870, 75923, 120144, 90536, 94564, 166402, 109689, 150069, 156292],
      'Other Investing Activities': [846, 165, -1205, -865, 1909, 1909, -1205, -865, 165, 1909],
      'Net Cash Used For Investing Activities': [-3710, 22403, -46056, -30458, 29144, -58689, -46919, -13178, -25981, -9004],
      'Debt Repayment': [-9543, -9543, -9543, -9543, -9543, -9543, -9543, -9543, -9543, -9543],
      'Common Stock Issued': [1175, 880, 1105, 555, 781, 495, 495, 349, 349, 349],
      'Common Stock Repurchased': [-77550, -89402, -85971, -88287, -35253, -46671, -43229, -22950, -13712, -10747],
      'Dividends Paid': [-14841, -14467, -14431, -14081, -12769, -11561, -10825, -10718, -10564, -10717],
      'Other Financing Activities': [-4798, -7711, -4445, -6445, -7711, -5365, -6445, -7445, -5365, -4445],
      'Net Cash Used Provided By Financing Activities': [-105557, -119243, -113285, -117801, -64495, -72645, -69547, -50307, -38835, -35103],
      'Effect Of Forex Changes On Cash': [-761, -180, 357, 137, -1006, 357, 137, -180, 357, 137],
      'Net Change In Cash': [6587, 14423, -40760, -44084, 44317, -61586, -38895, -67, 1365, 37296],
      'Cash At End Of Period': [29943, 23436, 9016, 49760, 93844, 49527, 111139, 150042, 150109, 113845],
      'Cash At Beginning Of Period': [23356, 9013, 49776, 93844, 49527, 111113, 150034, 150109, 148744, 76549],
      'Operating Cash Flow': [116615, 111443, 118224, 104038, 80674, 69391, 77434, 63598, 65824, 81266],
      'Capital Expenditure': [-10959, -7709, -11085, -7309, -7027, -12734, -12451, -13313, -9813, -10495],
      'Free Cash Flow': [105656, 103734, 107139, 96729, 73647, 56657, 64983, 50285, 56011, 70771],
    },
  };

  const getData = () => {
    // Use real-time data if available, otherwise fallback to mock data
    let data: { [key: string]: (string | number)[] };
    
    if (Object.keys(financialData).length > 0) {
      data = financialData;
    } else {
      // Fallback to mock data
      switch (statementType) {
        case 'balance':
          data = mockFinancialData.balance;
          break;
        case 'cashflow':
          data = mockFinancialData.cashflow;
          break;
        default:
          data = mockFinancialData.income;
      }
    }
    
    // Filter out rows where all values are zero
    const filteredData: { [key: string]: (string | number)[] } = {};
    
    Object.entries(data).forEach(([key, values]) => {
      // Check if all numeric values are zero (ignore percentage strings)
      const hasNonZeroValue = values.some(value => {
        if (typeof value === 'string') return true; // Keep percentage rows
        return value !== 0 && value !== null && value !== undefined;
      });
      
      if (hasNonZeroValue) {
        filteredData[key] = values;
      }
    });
    
    return filteredData;
  };

  const isHighlightedRow = (key: string) => {
    const highlightedRows = [
      // Income Statement
      'Revenue', 'Gross Profit', 'Operating Income', 'Net Income',
      // Balance Sheet
      'Total Assets', 'Total Current Assets', 'Total Liabilities', 'Total Current Liabilities', 
      'Total Stockholders Equity', 'Cash And Cash Equivalents',
      // Cash Flow Statement
      'Net Cash Provided By Operating Activities', 'Net Cash Used For Investing Activities',
      'Net Cash Used Provided By Financing Activities', 'Operating Cash Flow', 'Free Cash Flow'
    ];
    return highlightedRows.includes(key);
  };

  const formatValue = (key: string, value: string | number) => {
    if (typeof value === 'string') return value;
    
    // Display dash for zero values
    if (value === 0 || value === null || value === undefined) {
      return '-';
    }
    
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

  // Show loading state briefly, then proceed with available data
  if (isLoading && !rawFinancialData) {
    return (
      <div className="h-full bg-openbb-bg-widget border border-openbb-border">
        <WidgetHeaderWithTicker
          title="Financial Statements"
          ticker={ticker}
          onTickerChange={onTickerChange}
          onAdd={() => {
            const financialData = {
              statementType,
              viewType,
              data: rawFinancialData || [],
              transformedData: financialData
            };
            addWidgetContext(WidgetType.FINANCIAL_STATEMENTS, financialData, `Financial Statements - ${ticker}`);
          }}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="h-full bg-openbb-bg-widget border border-openbb-border flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openbb-accent mx-auto mb-4"></div>
            <p className="text-openbb-text-muted  text-sm">Loading financial data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-openbb-bg-widget border border-openbb-border flex flex-col">
      <WidgetHeaderWithTicker
        title="Financial Statements"
        ticker={ticker}
        onTickerChange={onTickerChange}
        onAdd={() => {
          const financialDataContext = {
            statementType,
            viewType,
            data: rawFinancialData || [],
            transformedData: financialData
          };
          addWidgetContext(WidgetType.FINANCIAL_STATEMENTS, financialDataContext, `Financial Statements - ${ticker}`);
        }}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          {rawFinancialData && rawFinancialData.length > 0 ? (
            <span className="text-xs text-openbb-accent  bg-openbb-bg-hover px-2 py-1 rounded">LIVE</span>
          ) : (
            <span className="text-xs text-yellow-500  bg-openbb-bg-hover px-2 py-1 rounded">DEMO</span>
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
                  'px-3 py-1 text-xs  rounded transition-colors',
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
                  'px-3 py-1 text-xs  rounded transition-colors',
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
      <div className="overflow-auto flex-grow relative">
        <table className="w-full text-xs ">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-openbb-border bg-openbb-bg-secondary">
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium sticky left-0 bg-openbb-bg-secondary z-30 border-r border-openbb-border">
                Index
              </th>
              {years.map((year) => (
                <th key={year} className="text-right py-3 px-4 text-openbb-text-secondary font-medium min-w-[100px] bg-openbb-bg-secondary">
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
            
            {/* Source Row */}
            <tr className="border-t border-openbb-border bg-openbb-bg-secondary/50">
              <td className="py-2.5 px-4 sticky left-0 bg-inherit z-10 border-r border-openbb-border text-openbb-text-secondary text-xs ">
                Source
              </td>
              {years.map((year, idx) => {
                // Get the filing data for this specific year/period
                const filingData = rawFinancialData?.[idx];
                const secLink = filingData?.finalLink || filingData?.link;
                const cik = filingData?.cik || getCIK();
                const filingYear = filingData?.calendarYear || year;
                const filingPeriod = filingData?.period;
                
                // Determine if this is annual or quarterly based on period
                const isAnnual = apiPeriod === 'annual' || filingPeriod === 'FY';
                const formType = isAnnual ? '10-K' : '10-Q';
                
                // Use direct link if available, otherwise construct EDGAR search
                const linkUrl = secLink || (cik ? 
                  `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=${formType}&dateb=${filingYear}1231&datea=${filingYear}0101&count=1` : 
                  null
                );
                
                return (
                  <td key={idx} className="text-right py-2.5 px-4 min-w-[100px]">
                    {linkUrl ? (
                      <a
                        href={linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-openbb-accent hover:underline "
                      >
                        Link
                      </a>
                    ) : (
                      <span className="text-xs text-openbb-text-muted ">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="p-3">
          <p className="text-xxs text-openbb-text-muted ">
            Note: Millions of USD except Per Share Values
          </p>
        </div>
      </div>
    </div>
  );
};

export default FinancialStatements;