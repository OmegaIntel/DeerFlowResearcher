import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, MessageSquare, Paperclip, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import './DealWorklistView.css';

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
  reviewers: Array<{
    name: string;
    avatar?: string;
  }>;
  pr?: string;
  findings?: number;
  comments?: number;
  attachments?: number;
  reply?: number;
  labels?: number;
  startDate: Date;
  dueDate: Date;
  completionPercentage?: number;
}

interface DealWorklistViewProps {
  deals: Deal[];
  onUpdateStatus: (dealId: string, status: Deal['status']) => void;
  onAddDeal: (deal: Partial<Deal>) => void;
  selectedCategory: string;
}

const DealWorklistView: React.FC<DealWorklistViewProps> = ({
  deals,
  onUpdateStatus,
  onAddDeal,
  selectedCategory
}) => {
  // Column widths state
  const [columnWidths, setColumnWidths] = useState({
    id: 80,
    title: 400,
    pr: 80,
    status: 120,
    assignee: 180,
    reviewers: 120,
    findings: 100,
    reply: 100
  });
  
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  
  // Handle column resize
  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault();
    setIsResizing(column);
    startXRef.current = e.clientX;
    startWidthRef.current = columnWidths[column as keyof typeof columnWidths];
  };
  
  useEffect(() => {
    if (!isResizing) return;
    
    // Add class to body to prevent text selection
    document.body.classList.add('resizing');
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(50, startWidthRef.current + diff); // Min width 50px
      
      setColumnWidths(prev => ({
        ...prev,
        [isResizing]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      setIsResizing(null);
      document.body.classList.remove('resizing');
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [isResizing]);
  
  const getStatusIcon = (status: Deal['status']) => {
    switch (status) {
      case 'open':
        return <div className="w-2 h-2 rounded-full bg-blue-500" />;
      case 'in-progress':
        return <div className="w-2 h-2 rounded-full bg-yellow-500" />;
      case 'resolved':
        return <div className="w-2 h-2 rounded-full bg-green-500" />;
    }
  };

  const getStatusColor = (status: Deal['status']) => {
    switch (status) {
      case 'open':
        return 'text-blue-500';
      case 'in-progress':
        return 'text-yellow-500';
      case 'resolved':
        return 'text-green-500';
    }
  };

  const getCategoryDisplay = (category: string) => {
    switch (category) {
      case 'due-diligence':
        return 'Due Diligence List';
      case 'finance':
        return 'Finance';
      case 'human-resource':
        return 'Human Resource';
      case 'sales-operations':
        return 'Sales and Operations';
      default:
        return category;
    }
  };

  // Group deals by category
  const groupedDeals = deals.reduce((acc, deal) => {
    const category = deal.category || 'uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(deal);
    return acc;
  }, {} as Record<string, Deal[]>);

  return (
    <div className="h-full overflow-auto" ref={tableRef}>
      <div className="min-w-fit">
        {/* Header */}
        <div className="flex sticky top-0 z-10 bg-openbb-bg-secondary border-b border-openbb-border">
          <div 
            className="relative flex items-center px-4 py-1.5 text-xs font-medium text-openbb-text-muted"
            style={{ width: columnWidths.id }}
          >
            ID
            <div
              className="column-resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'id')}
            />
          </div>
          <div 
            className="relative flex items-center px-4 py-1.5 text-xs font-medium text-openbb-text-muted"
            style={{ width: columnWidths.title }}
          >
            Title
            <div
              className="column-resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'title')}
            />
          </div>
          <div 
            className="relative flex items-center px-4 py-1.5 text-xs font-medium text-openbb-text-muted"
            style={{ width: columnWidths.pr }}
          >
            PR
            <div
              className="column-resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'pr')}
            />
          </div>
          <div 
            className="relative flex items-center px-4 py-1.5 text-xs font-medium text-openbb-text-muted"
            style={{ width: columnWidths.status }}
          >
            Status
            <div
              className="column-resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'status')}
            />
          </div>
          <div 
            className="relative flex items-center px-4 py-1.5 text-xs font-medium text-openbb-text-muted"
            style={{ width: columnWidths.assignee }}
          >
            Assignee
            <div
              className="column-resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'assignee')}
            />
          </div>
          <div 
            className="relative flex items-center px-4 py-1.5 text-xs font-medium text-openbb-text-muted"
            style={{ width: columnWidths.reviewers }}
          >
            Reviewers
            <div
              className="column-resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'reviewers')}
            />
          </div>
          <div 
            className="relative flex items-center px-4 py-1.5 text-xs font-medium text-openbb-text-muted"
            style={{ width: columnWidths.findings }}
          >
            Findings
            <div
              className="column-resize-handle"
              onMouseDown={(e) => handleMouseDown(e, 'findings')}
            />
          </div>
          <div 
            className="relative flex items-center px-4 py-1.5 text-xs font-medium text-openbb-text-muted"
            style={{ width: columnWidths.reply }}
          >
            Reply
          </div>
        </div>

        {/* Deal Groups */}
        {Object.entries(groupedDeals).map(([category, categoryDeals]) => (
          <div key={category} className="mb-2">
            {/* Category Header */}
            <div className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-openbb-text-primary bg-openbb-bg-secondary border-b border-openbb-border">
              <span>{getCategoryDisplay(category)}</span>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-openbb-text-muted">
                  {categoryDeals.filter(d => d.status === 'open').length}/{categoryDeals.length}
                </span>
                <div className="text-xs text-openbb-text-muted">
                  {Math.round((categoryDeals.filter(d => d.status === 'resolved').length / categoryDeals.length) * 100)}%
                </div>
              </div>
            </div>

            {/* Deals */}
            {categoryDeals.map((deal) => (
              <div
                key={deal.id}
                className="flex border-b border-openbb-border hover:bg-openbb-bg-hover transition-colors"
              >
                {/* Checkbox & ID */}
                <div 
                  className="flex items-center gap-2 px-4 py-1.5"
                  style={{ width: columnWidths.id }}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-openbb-border"
                  />
                  <span className="text-xs text-openbb-text-muted">{deal.taskId}</span>
                </div>

                {/* Title */}
                <div 
                  className="flex items-center px-4 py-1.5"
                  style={{ width: columnWidths.title }}
                >
                  <div className="text-xs text-openbb-text-primary truncate">{deal.title}</div>
                </div>

                {/* PR */}
                <div 
                  className="flex items-center px-4 py-1.5"
                  style={{ width: columnWidths.pr }}
                >
                  {deal.pr && (
                    <span className="text-xs text-openbb-text-muted">{deal.pr}</span>
                  )}
                </div>

                {/* Status */}
                <div 
                  className="flex items-center px-4 py-1.5"
                  style={{ width: columnWidths.status }}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(deal.status)}
                    <span className={`text-xs ${getStatusColor(deal.status)}`}>
                      {deal.status === 'in-progress' ? 'In progress' : 
                       deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Assignee */}
                <div 
                  className="flex items-center px-4 py-1.5"
                  style={{ width: columnWidths.assignee }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-openbb-bg-hover flex items-center justify-center text-[10px] text-openbb-text-primary">
                      {deal.assignee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-xs text-openbb-text-primary truncate">{deal.assignee.name}</span>
                  </div>
                </div>

                {/* Reviewers */}
                <div 
                  className="flex items-center px-4 py-1.5"
                  style={{ width: columnWidths.reviewers }}
                >
                  <div className="flex items-center gap-0.5">
                    {deal.reviewers.slice(0, 2).map((reviewer, idx) => (
                      <div
                        key={idx}
                        className="w-5 h-5 rounded-full bg-openbb-bg-hover flex items-center justify-center text-[10px] text-openbb-text-primary"
                      >
                        {reviewer.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    ))}
                    {deal.reviewers.length > 2 && (
                      <span className="text-[10px] text-openbb-text-muted">
                        +{deal.reviewers.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Findings */}
                <div 
                  className="flex items-center px-4 py-1.5"
                  style={{ width: columnWidths.findings }}
                >
                  <div className="flex items-center gap-3">
                    {deal.findings && (
                      <div className="flex items-center gap-1">
                        <Users size={14} className="text-yellow-500" />
                        <span className="text-xs text-openbb-text-muted">{deal.findings}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply */}
                <div 
                  className="flex items-center px-4 py-1.5"
                  style={{ width: columnWidths.reply }}
                >
                  <div className="flex items-center gap-2">
                    {deal.comments && (
                      <div className="flex items-center gap-1">
                        <MessageSquare size={14} className="text-openbb-text-muted" />
                        <span className="text-xs text-openbb-text-muted">{deal.comments}</span>
                      </div>
                    )}
                    {deal.attachments && (
                      <div className="flex items-center gap-1">
                        <Paperclip size={14} className="text-openbb-text-muted" />
                        <span className="text-xs text-openbb-text-muted">{deal.attachments}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DealWorklistView;