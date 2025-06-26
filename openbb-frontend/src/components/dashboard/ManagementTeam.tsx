import React from 'react';
import { useManagementTeamRealTime } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';
import { downloadTableAsCSV } from '../../utils/csvExport';

interface ManagementTeamProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const ManagementTeam: React.FC<ManagementTeamProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: management, isLoading, error } = useManagementTeamRealTime(ticker);
  const { addWidgetContext } = useCopilot();

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 animate-pulse" data-testid="management-team-loading">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-openbb-bg-hover rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !management || management.length === 0) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <WidgetHeaderWithTicker
          title="Management Team"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(WidgetType.MANAGEMENT_TEAM, management, ticker, 'Management Team')}
          onDownload={() => downloadTableAsCSV(
            management,
            [
              { label: 'Name', value: 'name' },
              { label: 'Title', value: 'title' },
              { label: 'Compensation', value: (item: any) => item.compensation > 0 ? item.compensation : 'N/A' },
              { label: 'Currency', value: (item: any) => item.currency || 'USD' }
            ],
            `${ticker}_management_team.csv`
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <p className="text-xs  text-openbb-text-muted">No management data available</p>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Management Team"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => addWidgetContext(
          WidgetType.MANAGEMENT_TEAM,
          management,
          ticker,
          'Management Team'
        )}
        onDownload={() => downloadTableAsCSV(
          management,
          [
            { label: 'Name', value: 'name' },
            { label: 'Title', value: 'title' },
            { label: 'Compensation', value: (item: any) => item.compensation > 0 ? item.compensation : 'N/A' },
            { label: 'Currency', value: (item: any) => item.currency || 'USD' }
          ],
          `${ticker}_management_team.csv`
        )}
        onSettings={onSettings}
        onRemove={onRemove}
      />

      <div className="widget-content flex-1 overflow-auto">

        <table className="w-full">
          <thead>
            <tr className="border-b border-openbb-border">
              <th className="text-left py-2 px-2 text-xs  font-semibold text-openbb-text-secondary">Name</th>
              <th className="text-left py-2 px-2 text-xs  font-semibold text-openbb-text-secondary">Title</th>
              <th className="text-right py-2 px-2 text-xs  font-semibold text-openbb-text-secondary">Compensation</th>
              <th className="text-center py-2 px-2 text-xs  font-semibold text-openbb-text-secondary">Currency</th>
            </tr>
          </thead>
          <tbody>
            {management.map((member, index) => (
              <tr key={index} className="border-b border-openbb-border hover:bg-openbb-bg-hover">
                <td className="py-2 px-2 text-xs  text-openbb-text-primary">{member.name}</td>
                <td className="py-2 px-2 text-xs  text-openbb-text-muted">{member.title}</td>
                <td className="py-2 px-2 text-xs  text-right font-medium text-openbb-text-primary">
                  {member.compensation > 0 ? 
                    new Intl.NumberFormat('en-US', { 
                      style: 'currency', 
                      currency: member.currency || 'USD', 
                      maximumFractionDigits: 0 
                    }).format(member.compensation) : 
                    'N/A'
                  }
                </td>
                <td className="py-2 px-2 text-xs  text-center text-openbb-text-muted">
                  {member.currency || 'USD'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagementTeam;