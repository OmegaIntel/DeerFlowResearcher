import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionButtonProps {
  onClick: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 bg-openbb-accent hover:bg-openbb-accent-hover text-openbb-bg-primary rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
      title="Add Widget"
      data-testid="add-widget-button"
    >
      <Plus size={24} />
    </button>
  );
};

export default FloatingActionButton;