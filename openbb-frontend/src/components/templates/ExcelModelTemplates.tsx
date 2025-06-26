import React from 'react';
import { FileSpreadsheet, TrendingUp, Calculator, DollarSign, BarChart3 } from 'lucide-react';

export interface ExcelTemplate {
  id: string;
  name: string;
  description: string;
  category: 'valuation' | 'financial' | 'analysis' | 'reporting';
  icon: React.ReactNode;
  downloadUrl?: string;
}

export const excelTemplates: ExcelTemplate[] = [
  {
    id: 'dcf-model',
    name: 'DCF Valuation Model',
    description: 'Discounted Cash Flow model with sensitivity analysis and terminal value calculations',
    category: 'valuation',
    icon: <TrendingUp className="text-blue-500" size={20} />,
  },
  {
    id: 'three-statement',
    name: 'Three Statement Model',
    description: 'Integrated financial statements with balance sheet, income statement, and cash flow',
    category: 'financial',
    icon: <FileSpreadsheet className="text-green-500" size={20} />,
  },
  {
    id: 'lbo-model',
    name: 'LBO Model',
    description: 'Leveraged Buyout model with debt schedule, returns analysis, and exit scenarios',
    category: 'valuation',
    icon: <DollarSign className="text-purple-500" size={20} />,
  },
  {
    id: 'comp-analysis',
    name: 'Comparable Company Analysis',
    description: 'Trading and transaction comparables with multiple valuation metrics',
    category: 'analysis',
    icon: <BarChart3 className="text-orange-500" size={20} />,
  },
  {
    id: 'merger-model',
    name: 'M&A Model',
    description: 'Merger model with accretion/dilution analysis and synergy calculations',
    category: 'valuation',
    icon: <Calculator className="text-red-500" size={20} />,
  },
  {
    id: 'budget-forecast',
    name: 'Budget & Forecast Model',
    description: 'Annual budgeting and multi-year forecast with variance analysis',
    category: 'financial',
    icon: <FileSpreadsheet className="text-teal-500" size={20} />,
  },
  {
    id: 'dashboard-template',
    name: 'Financial Dashboard',
    description: 'Executive dashboard with KPIs, charts, and automated data connections',
    category: 'reporting',
    icon: <BarChart3 className="text-indigo-500" size={20} />,
  },
  {
    id: 'sensitivity-analysis',
    name: 'Sensitivity Analysis',
    description: 'Multi-variable sensitivity and scenario analysis with data tables',
    category: 'analysis',
    icon: <TrendingUp className="text-yellow-500" size={20} />,
  }
];

interface TemplateCardProps {
  template: ExcelTemplate;
  onSelect: (template: ExcelTemplate) => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(template)}
      className="bg-openbb-bg-widget hover:bg-openbb-bg-hover rounded-lg p-4 cursor-pointer transition-colors border border-transparent hover:border-blue-600"
    >
      <div className="flex items-start gap-3">
        {template.icon}
        <div className="flex-1">
          <h4 className="font-medium text-white mb-1">{template.name}</h4>
          <p className="text-xs text-gray-400 line-clamp-2">{template.description}</p>
          <span className="inline-block mt-2 px-2 py-1 bg-openbb-bg-secondary rounded text-xs text-openbb-text-muted capitalize">
            {template.category}
          </span>
        </div>
      </div>
    </div>
  );
};