import React, { useState } from 'react';
import { X, Save, Key, Database, AlertCircle } from 'lucide-react';
import { INTEGRATION_OPTIONS } from '../../services/mindsdbService';
import { mindsdbService } from '../../services/mindsdbService';
import type { IntegrationOption } from '../../services/mindsdbService';
import classNames from 'classnames';

interface IntegrationSetupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIntegration?: IntegrationOption;
}

const IntegrationSetup: React.FC<IntegrationSetupProps> = ({ isOpen, onClose, selectedIntegration }) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !selectedIntegration) return null;

  const handleInputChange = (param: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/v1/mindsdb/integrations/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          integration_id: selectedIntegration.id,
          connection_params: formData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setFormData({});
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.error || 'Failed to create connection');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create connection');
    } finally {
      setIsLoading(false);
    }
  };

  const getParamPlaceholder = (param: string): string => {
    const placeholders: Record<string, string> = {
      'host': 'localhost',
      'port': '5432',
      'database': 'mydb',
      'user': 'username',
      'password': '••••••••',
      'api_key': 'your-api-key',
      'access_token': 'your-access-token',
      'client_id': 'your-client-id',
      'client_secret': 'your-client-secret',
      'bucket': 'my-bucket',
      'account': 'myaccount.snowflakecomputing.com',
      'warehouse': 'COMPUTE_WH',
      'project_id': 'my-project-123',
      'dataset': 'my_dataset',
      'spreadsheet_id': '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      'security_token': 'your-security-token',
      'credentials_file': '/path/to/credentials.json',
      'bot_token': 'xoxb-your-bot-token',
      'shop_url': 'myshop.myshopify.com',
      'service_account_json': '{"type": "service_account", ...}'
    };
    return placeholders[param] || `Enter ${param}`;
  };

  const getParamType = (param: string): string => {
    if (param.includes('password') || param.includes('secret') || param.includes('token') || param.includes('key')) {
      return 'password';
    }
    if (param.includes('port')) {
      return 'number';
    }
    if (param.includes('json') || param === 'credentials_file') {
      return 'textarea';
    }
    return 'text';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-openbb-bg-widget rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-openbb-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="text-openbb-accent" size={24} />
              <h2 className="text-xl font-semibold text-openbb-text-primary">
                Connect to {selectedIntegration.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-openbb-text-secondary hover:text-openbb-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(80vh-200px)]">
          <p className="text-sm text-openbb-text-secondary mb-6">
            {selectedIntegration.description}
          </p>

          {selectedIntegration.requiredParams.map(param => {
            const inputType = getParamType(param);
            
            return (
              <div key={param} className="space-y-2">
                <label className="block text-sm font-medium text-openbb-text-primary">
                  {param.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                
                {inputType === 'textarea' ? (
                  <textarea
                    value={formData[param] || ''}
                    onChange={(e) => handleInputChange(param, e.target.value)}
                    placeholder={getParamPlaceholder(param)}
                    className="w-full px-4 py-2 bg-openbb-bg-primary border border-openbb-border rounded-lg text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent"
                    rows={4}
                    required
                  />
                ) : (
                  <div className="relative">
                    {param.includes('key') || param.includes('token') && (
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-openbb-text-muted" size={16} />
                    )}
                    <input
                      type={inputType}
                      value={formData[param] || ''}
                      onChange={(e) => handleInputChange(param, e.target.value)}
                      placeholder={getParamPlaceholder(param)}
                      className={classNames(
                        "w-full px-4 py-2 bg-openbb-bg-primary border border-openbb-border rounded-lg text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent",
                        (param.includes('key') || param.includes('token')) && 'pl-10'
                      )}
                      required
                    />
                  </div>
                )}
              </div>
            );
          })}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-500 mt-0.5" size={16} />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
              <p className="text-sm text-green-500">
                Successfully connected to {selectedIntegration.name}!
              </p>
            </div>
          )}
        </form>

        <div className="p-6 border-t border-openbb-border flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-openbb-bg-hover text-openbb-text-secondary rounded-lg hover:bg-openbb-bg-primary transition-colors"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={classNames(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              isLoading
                ? "bg-openbb-bg-hover text-openbb-text-muted cursor-not-allowed"
                : "bg-openbb-accent text-white hover:bg-openbb-accent/90"
            )}
            disabled={isLoading}
          >
            <Save size={16} />
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;