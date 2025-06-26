import React, { useState } from 'react';
import { ExternalLink, Key, CheckCircle, Info } from 'lucide-react';
import { dataSources } from '../../data/dataSourcesInfo';
import classNames from 'classnames';

const DataSourcesTable: React.FC = () => {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'free' | 'api-key'>('all');

  const filteredSources = dataSources.filter(source => {
    if (filter === 'free') return !source.requiresKey;
    if (filter === 'api-key') return source.requiresKey;
    return true;
  });

  const toggleExpanded = (sourceId: string) => {
    setExpandedSource(expandedSource === sourceId ? null : sourceId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={classNames(
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            filter === 'all' 
              ? 'bg-openbb-accent text-white' 
              : 'bg-openbb-bg-hover text-openbb-text-secondary hover:text-openbb-text-primary'
          )}
        >
          All Sources
        </button>
        <button
          onClick={() => setFilter('free')}
          className={classNames(
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            filter === 'free' 
              ? 'bg-openbb-accent text-white' 
              : 'bg-openbb-bg-hover text-openbb-text-secondary hover:text-openbb-text-primary'
          )}
        >
          Free (No Key)
        </button>
        <button
          onClick={() => setFilter('api-key')}
          className={classNames(
            'px-3 py-1 rounded text-sm font-medium transition-colors',
            filter === 'api-key' 
              ? 'bg-openbb-accent text-white' 
              : 'bg-openbb-bg-hover text-openbb-text-secondary hover:text-openbb-text-primary'
          )}
        >
          API Key Required
        </button>
      </div>

      {/* Data Sources Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-openbb-bg-secondary z-10">
            <tr className="border-b border-openbb-border">
              <th className="text-left py-3 px-4 font-medium text-openbb-text-secondary">Source</th>
              <th className="text-left py-3 px-4 font-medium text-openbb-text-secondary">API Key</th>
              <th className="text-left py-3 px-4 font-medium text-openbb-text-secondary">Rate Limits</th>
              <th className="text-left py-3 px-4 font-medium text-openbb-text-secondary">Documentation</th>
              <th className="text-center py-3 px-4 font-medium text-openbb-text-secondary">Data Points</th>
            </tr>
          </thead>
          <tbody>
            {filteredSources.map((source) => (
              <React.Fragment key={source.id}>
                <tr 
                  className="border-b border-openbb-border/50 hover:bg-openbb-bg-hover/50 cursor-pointer transition-colors"
                  onClick={() => toggleExpanded(source.id)}
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-openbb-text-primary">{source.name}</div>
                    <div className="text-xs text-openbb-text-muted">{source.id}</div>
                  </td>
                  <td className="py-3 px-4">
                    {source.requiresKey ? (
                      <div className="flex items-center gap-2">
                        <Key size={14} className="text-yellow-500" />
                        <span className="text-yellow-500 text-xs">Required</span>
                        {source.signupUrl && (
                          <a
                            href={source.signupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-openbb-accent hover:text-openbb-accent/80 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        <span className="text-green-500 text-xs">Free</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-xs text-openbb-text-secondary">{source.limits}</span>
                  </td>
                  <td className="py-3 px-4">
                    <a
                      href={source.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-openbb-accent hover:text-openbb-accent/80 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-xs">API Docs</span>
                      <ExternalLink size={12} />
                    </a>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button className="inline-flex items-center gap-1 text-openbb-text-secondary hover:text-openbb-text-primary transition-colors">
                      <Info size={14} />
                      <span className="text-xs">
                        {source.dataPoints.reduce((acc, cat) => acc + cat.endpoints.length, 0)} endpoints
                      </span>
                    </button>
                  </td>
                </tr>
                
                {/* Expanded Data Points */}
                {expandedSource === source.id && (
                  <tr className="bg-openbb-bg-hover/30">
                    <td colSpan={5} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {source.dataPoints.map((category, idx) => (
                          <div key={idx} className="bg-openbb-bg-widget rounded-lg p-3 border border-openbb-border/50">
                            <h4 className="font-medium text-openbb-text-primary mb-2 text-sm">
                              {category.category}
                            </h4>
                            <ul className="space-y-1">
                              {category.endpoints.map((endpoint, endpointIdx) => (
                                <li key={endpointIdx} className="text-xs text-openbb-text-secondary flex items-start gap-1">
                                  <span className="text-openbb-accent mt-1">•</span>
                                  <span>{endpoint}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        
                        {/* Environment Variable Info */}
                        {source.requiresKey && source.apiKeyEnvVar && (
                          <div className="bg-openbb-bg-widget rounded-lg p-3 border border-openbb-border/50 col-span-full">
                            <h4 className="font-medium text-openbb-text-primary mb-2 text-sm">
                              Environment Variable
                            </h4>
                            <code className="text-xs bg-openbb-bg-secondary px-2 py-1 rounded text-openbb-accent">
                              {source.apiKeyEnvVar}
                            </code>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-openbb-bg-hover rounded-lg text-xs text-openbb-text-secondary">
        <div className="flex items-center justify-between">
          <span>
            Total: {filteredSources.length} data sources
          </span>
          <span>
            Free: {filteredSources.filter(s => !s.requiresKey).length} | 
            API Key Required: {filteredSources.filter(s => s.requiresKey).length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DataSourcesTable;