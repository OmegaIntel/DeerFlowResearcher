import React from 'react';
import { format, differenceInDays } from 'date-fns';

interface Deal {
  id: string;
  taskId: string;
  title: string;
  category: string;
  status: 'open' | 'in-progress' | 'resolved';
  assignee: {
    name: string;
    avatar?: string;
  };
  startDate: Date;
  dueDate: Date;
  completionPercentage?: number;
}

interface DealTimelineViewProps {
  deals: Deal[];
  onUpdateStatus: (dealId: string, status: Deal['status']) => void;
}

const DealTimelineView: React.FC<DealTimelineViewProps> = ({ deals, onUpdateStatus }) => {
  // Calculate timeline bounds
  const allDates = deals.flatMap(d => [new Date(d.startDate), new Date(d.dueDate)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const totalDays = differenceInDays(maxDate, minDate) + 1;

  // Generate month headers
  const months: { date: Date; days: number }[] = [];
  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = monthStart < minDate ? minDate : monthStart;
    const endDay = monthEnd > maxDate ? maxDate : monthEnd;
    const days = differenceInDays(endDay, startDay) + 1;
    
    months.push({ date: monthStart, days });
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  const getPositionForDate = (date: Date) => {
    const days = differenceInDays(date, minDate);
    return (days / totalDays) * 100;
  };

  const getBarWidth = (start: Date, end: Date) => {
    const days = differenceInDays(end, start) + 1;
    return (days / totalDays) * 100;
  };

  const getStatusColor = (status: Deal['status']) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-yellow-500';
      case 'open':
        return 'bg-blue-500';
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[1200px] p-6">
        {/* Month Headers */}
        <div className="flex border-b border-openbb-border mb-4 sticky top-0 bg-openbb-bg-primary z-10">
          <div className="w-64 flex-shrink-0"></div>
          <div className="flex-1 flex">
            {months.map((month, idx) => (
              <div
                key={idx}
                className="border-r border-openbb-border px-2 py-2 text-sm font-medium text-openbb-text-primary"
                style={{ width: `${(month.days / totalDays) * 100}%` }}
              >
                {format(month.date, 'MMM yyyy')}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="space-y-2">
          {deals.map((deal) => {
            const startPos = getPositionForDate(new Date(deal.startDate));
            const width = getBarWidth(new Date(deal.startDate), new Date(deal.dueDate));

            return (
              <div key={deal.id} className="flex items-center group">
                {/* Deal Info */}
                <div className="w-64 flex-shrink-0 pr-4">
                  <div className="text-sm font-medium text-openbb-text-primary truncate">
                    {deal.taskId} - {deal.title}
                  </div>
                  <div className="text-xs text-openbb-text-muted">
                    {deal.assignee.name}
                  </div>
                </div>

                {/* Timeline Bar */}
                <div className="flex-1 relative h-8">
                  <div className="absolute inset-0 border-l border-r border-openbb-border opacity-10"></div>
                  <div
                    className={`absolute top-1 bottom-1 rounded ${getStatusColor(deal.status)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                    style={{
                      left: `${startPos}%`,
                      width: `${width}%`,
                    }}
                    onClick={() => {
                      const nextStatus = 
                        deal.status === 'open' ? 'in-progress' :
                        deal.status === 'in-progress' ? 'resolved' : 'open';
                      onUpdateStatus(deal.id, nextStatus);
                    }}
                  >
                    {deal.completionPercentage && (
                      <div
                        className="h-full bg-black bg-opacity-20 rounded"
                        style={{ width: `${deal.completionPercentage}%` }}
                      />
                    )}
                  </div>
                  
                  {/* Dates on hover */}
                  <div className="absolute left-0 -top-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-xs text-openbb-text-muted bg-openbb-bg-widget px-2 py-1 rounded shadow">
                      {format(new Date(deal.startDate), 'MMM d')} - {format(new Date(deal.dueDate), 'MMM d')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DealTimelineView;