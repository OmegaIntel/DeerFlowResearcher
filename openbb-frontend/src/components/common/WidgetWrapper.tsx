import React from 'react';

interface WidgetWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const WidgetWrapper: React.FC<WidgetWrapperProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-openbb-bg-widget rounded-lg border border-openbb-border h-full flex flex-col ${className}`}>
      <div className="widget-content-wrapper">
        {children}
      </div>
    </div>
  );
};

export default WidgetWrapper;