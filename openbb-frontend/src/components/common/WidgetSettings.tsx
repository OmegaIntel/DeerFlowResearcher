import React, { useState, useEffect } from 'react';
import { Settings, X, ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { useWidgets } from '../../contexts/WidgetContext';
import classNames from 'classnames';

interface ProviderInfo {
  name: string;
  displayName: string;
  available: boolean;
  reason?: string;
  rateLimit?: string;
  features?: string[];
}

interface WidgetSettingsProps {
  widgetId: string;
  widgetType: string;
  currentProvider?: string;
  onSave?: () => void;
  isLoadingProviderInfo?: boolean;
  providerStatus?: Record<string, { available: boolean; reason?: string }>;
}

// Map widget types to supported providers
const widgetProviderMap: Record<string, string[]> = {
  'ticker-info': ['polygon', 'alpha_vantage', 'fmp', 'yfinance'],
  'price-performance': ['polygon', 'alpha_vantage', 'fmp', 'yfinance'],
  'company-profile': ['fmp', 'alpha_vantage', 'polygon'],
  'key-metrics': ['fmp', 'alpha_vantage'],
  'company-news': ['benzinga', 'polygon', 'fmp'],
  'price-chart': ['alpha_vantage', 'polygon', 'fmp', 'yfinance'],
  'options-flow': ['polygon', 'benzinga'],
  'management-team': ['fmp'],
  'revenue-geography': ['fmp'],
  'revenue-business': ['fmp'],
  'valuation-multiples': ['fmp', 'alpha_vantage'],
  'share-statistics': ['fmp'],
  'insider-trading': ['fmp', 'benzinga'],
  'institutional-ownership': ['fmp'],
  'price-target': ['fmp', 'benzinga'],
  'company-filings': ['fmp', 'benzinga'],
  'earnings-transcripts': ['api_ninjas', 'fmp'],
  'financial-statements': ['fmp', 'alpha_vantage', 'polygon'],
};

// Provider display names and metadata
const providerMetadata: Record<string, Partial<ProviderInfo>> = {
  polygon: {
    displayName: 'Polygon',
    rateLimit: 'Unlimited (paid)',
    features: ['Real-time data', 'Options chain', 'Historical data'],
  },
  alpha_vantage: {
    displayName: 'Alpha Vantage',
    rateLimit: '5/min',
    features: ['Technical indicators', 'Fundamental data', 'Free tier'],
  },
  fmp: {
    displayName: 'Financial Modeling Prep',
    rateLimit: '250/day (free)',
    features: ['Comprehensive fundamentals', 'Revenue segments', 'SEC filings'],
  },
  benzinga: {
    displayName: 'Benzinga',
    rateLimit: 'Varies',
    features: ['News & sentiment', 'Analyst ratings', 'Options activity'],
  },
  yfinance: {
    displayName: 'Yahoo Finance',
    rateLimit: 'Unlimited',
    features: ['Free', 'Basic data', 'No API key required'],
  },
  api_ninjas: {
    displayName: 'API Ninjas',
    rateLimit: 'Limited',
    features: ['Earnings transcripts'],
  },
};

const WidgetSettings: React.FC<WidgetSettingsProps> = ({
  widgetId,
  widgetType,
  currentProvider = 'auto',
  onSave,
  isLoadingProviderInfo,
  providerStatus = {},
}) => {
  const { updateWidgetProvider } = useWidgets();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(currentProvider);
  const [showDropdown, setShowDropdown] = useState(false);

  const availableProviders = widgetProviderMap[widgetType] || [];

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    updateWidgetProvider(widgetId, provider);
    setShowDropdown(false);
  };

  const handleSave = () => {
    if (onSave) {
      onSave();
    }
    setIsOpen(false);
  };

  const getProviderInfo = (provider: string): ProviderInfo => {
    const metadata = providerMetadata[provider] || {};
    const status = providerStatus[provider] || { available: true };
    
    return {
      name: provider,
      displayName: metadata.displayName || provider,
      available: status.available,
      reason: status.reason,
      rateLimit: metadata.rateLimit,
      features: metadata.features,
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="widget-settings-modal">
          <div className="bg-openbb-bg-widget border border-openbb-border rounded-lg p-6 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-openbb-text-primary">
                Widget Settings
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingProviderInfo ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openbb-accent mx-auto mb-4"></div>
                <p className="text-sm text-openbb-text-muted">Loading provider information...</p>
              </div>
            ) : (
              <>
                {/* Provider Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-openbb-text-primary mb-2">
                    Data Provider
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="w-full bg-openbb-bg-secondary border border-openbb-border rounded px-3 py-2 text-left text-sm text-openbb-text-primary hover:bg-openbb-bg-hover transition-colors flex items-center justify-between"
                      aria-label="Data Provider"
                      role="combobox"
                      aria-expanded={showDropdown}
                      data-testid="provider-select"
                    >
                      <span>
                        {selectedProvider === 'auto'
                          ? 'Auto-select best provider'
                          : getProviderInfo(selectedProvider).displayName}
                      </span>
                      <ChevronDown className="w-4 h-4 text-openbb-text-muted" />
                    </button>

                    {showDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-openbb-bg-secondary border border-openbb-border rounded shadow-lg z-10 max-h-60 overflow-y-auto">
                        <button
                          onClick={() => handleProviderChange('auto')}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-openbb-bg-hover transition-colors text-openbb-text-primary"
                        >
                          Auto-select best provider
                        </button>
                        {availableProviders.map((provider) => {
                          const info = getProviderInfo(provider);
                          return (
                            <button
                              key={provider}
                              onClick={() => handleProviderChange(provider)}
                              disabled={!info.available}
                              className={classNames(
                                'w-full px-3 py-2 text-left text-sm transition-colors',
                                info.available
                                  ? 'hover:bg-openbb-bg-hover text-openbb-text-primary'
                                  : 'text-openbb-text-muted cursor-not-allowed'
                              )}
                              title={info.reason}
                            >
                              {info.displayName}
                              {!info.available && ' (Unavailable)'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Provider Info */}
                {selectedProvider !== 'auto' && (
                  <div className="mb-6 p-4 bg-openbb-bg-secondary rounded-lg">
                    <h4 className="text-sm font-medium text-openbb-text-primary mb-2">
                      {getProviderInfo(selectedProvider).displayName} Settings
                    </h4>
                    
                    {/* Rate Limit */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-openbb-text-muted">Rate Limit:</span>
                      <span className="text-openbb-text-primary">
                        {getProviderInfo(selectedProvider).rateLimit || 'N/A'}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-openbb-text-muted">Status:</span>
                      <span className={classNames(
                        'flex items-center gap-1',
                        getProviderInfo(selectedProvider).available
                          ? 'text-green-500'
                          : 'text-red-500'
                      )}>
                        {getProviderInfo(selectedProvider).available ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            {getProviderInfo(selectedProvider).reason || 'Unavailable'}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Features */}
                    {getProviderInfo(selectedProvider).features && (
                      <div className="mt-3">
                        <span className="text-xs text-openbb-text-muted">Features:</span>
                        <ul className="mt-1 space-y-1">
                          {getProviderInfo(selectedProvider).features!.map((feature, index) => (
                            <li key={index} className="text-xs text-openbb-text-primary flex items-center gap-1">
                              <span className="w-1 h-1 bg-openbb-accent rounded-full"></span>
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Provider-specific options */}
                    {selectedProvider === 'alpha_vantage' && widgetType === 'price-chart' && (
                      <div className="mt-4">
                        <label className="block text-xs font-medium text-openbb-text-primary mb-1">
                          Interval
                        </label>
                        <select className="w-full bg-openbb-bg-primary border border-openbb-border rounded px-2 py-1 text-xs text-openbb-text-primary">
                          <option value="1min">1 Minute</option>
                          <option value="5min">5 Minutes</option>
                          <option value="15min">15 Minutes</option>
                          <option value="30min">30 Minutes</option>
                          <option value="60min">60 Minutes</option>
                          <option value="daily">Daily</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm text-openbb-text-secondary hover:text-openbb-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-openbb-accent text-openbb-bg-primary text-sm font-medium rounded hover:bg-openbb-accent/90 transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
  );
};

export default WidgetSettings;