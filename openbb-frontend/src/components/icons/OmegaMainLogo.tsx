import React from 'react';

interface OmegaMainLogoProps {
  size?: number;
  className?: string;
}

const OmegaMainLogo: React.FC<OmegaMainLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <div 
      className={`bg-white rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <span 
        className="font-extrabold text-black"
        style={{ 
          fontSize: size * 0.5,
          lineHeight: 1,
          letterSpacing: '-0.05em'
        }}
      >
        OI
      </span>
    </div>
  );
};

export default OmegaMainLogo;