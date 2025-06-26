import React, { useState, useRef, useEffect } from 'react';
import OmegaMainLogo from '../icons/OmegaMainLogo';

interface FloatingCopilotButtonProps {
  onClick: () => void;
}

const FloatingCopilotButton: React.FC<FloatingCopilotButtonProps> = ({ onClick }) => {
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('floating-copilot-button-position');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 80, y: window.innerHeight - 80 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Save position to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('floating-copilot-button-position', JSON.stringify(position));
  }, [position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasMovedDuringDrag(false);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Check if the position has actually changed
    if (newX !== position.x || newY !== position.y) {
      setHasMovedDuringDrag(true);
    }

    // Keep button within viewport bounds
    const buttonSize = 56; // 14 * 4 (w-14 h-14)
    const maxX = window.innerWidth - buttonSize;
    const maxY = window.innerHeight - buttonSize;

    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY))
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);

    // Only trigger click if there was no movement during drag
    if (!hasMovedDuringDrag) {
      onClick();
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart, position, hasMovedDuringDrag]);

  return (
    <button
      ref={buttonRef}
      onMouseDown={handleMouseDown}
      className={`fixed w-14 h-14 bg-openbb-bg-secondary hover:bg-openbb-bg-hover rounded-full shadow-lg flex items-center justify-center transition-all duration-200 z-50 group ${
        isDragging ? 'scale-110 cursor-grabbing' : 'hover:scale-110 cursor-grab'
      }`}
      style={{
        left: position.x,
        top: position.y,
        transition: isDragging ? 'none' : 'transform 0.2s'
      }}
      title="Omega Copilot (Click or Drag to move)"
      data-testid="copilot-button"
    >
      <OmegaMainLogo size={28} className="transition-transform group-hover:scale-110" />
      <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Omega Copilot
      </span>
    </button>
  );
};

export default FloatingCopilotButton;