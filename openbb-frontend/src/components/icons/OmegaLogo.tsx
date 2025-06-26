import React from 'react';

interface OmegaLogoProps {
  size?: number;
  className?: string;
}

const OmegaLogo: React.FC<OmegaLogoProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Exact replica of omega logo1.png - network sphere */}
      
      {/* Main geometric structure - large nodes */}
      <circle cx="200" cy="110" r="18" fill="#3B82F6" />
      <circle cx="200" cy="290" r="18" fill="#3B82F6" />
      <circle cx="120" cy="200" r="16" fill="#3B82F6" />
      <circle cx="280" cy="200" r="16" fill="#3B82F6" />
      <circle cx="200" cy="200" r="16" fill="#3B82F6" />
      
      {/* Inner hexagon/octagon nodes */}
      <circle cx="165" cy="140" r="14" fill="#3B82F6" />
      <circle cx="235" cy="140" r="14" fill="#3B82F6" />
      <circle cx="165" cy="260" r="14" fill="#3B82F6" />
      <circle cx="235" cy="260" r="14" fill="#3B82F6" />
      <circle cx="140" cy="165" r="12" fill="#3B82F6" />
      <circle cx="140" cy="235" r="12" fill="#3B82F6" />
      <circle cx="260" cy="165" r="12" fill="#3B82F6" />
      <circle cx="260" cy="235" r="12" fill="#3B82F6" />
      
      {/* Outer perimeter nodes */}
      <circle cx="200" cy="80" r="10" fill="#3B82F6" />
      <circle cx="200" cy="320" r="10" fill="#3B82F6" />
      <circle cx="95" cy="200" r="10" fill="#3B82F6" />
      <circle cx="305" cy="200" r="10" fill="#3B82F6" />
      <circle cx="320" cy="260" r="16" fill="#3B82F6" />
      <circle cx="320" cy="140" r="12" fill="#3B82F6" />
      
      {/* Floating dots on the right */}
      <circle cx="340" cy="100" r="6" fill="#3B82F6" />
      <circle cx="350" cy="140" r="8" fill="#3B82F6" />
      <circle cx="360" cy="180" r="4" fill="#3B82F6" />
      <circle cx="370" cy="220" r="6" fill="#3B82F6" />
      <circle cx="350" cy="280" r="10" fill="#3B82F6" />
      
      {/* Small floating dots */}
      <circle cx="340" cy="50" r="3" fill="#3B82F6" />
      <circle cx="380" cy="80" r="4" fill="#3B82F6" />
      <circle cx="330" cy="320" r="4" fill="#3B82F6" />
      
      {/* Main structural connections - thick lines */}
      <line x1="200" y1="110" x2="165" y2="140" stroke="#3B82F6" strokeWidth="4" />
      <line x1="200" y1="110" x2="235" y2="140" stroke="#3B82F6" strokeWidth="4" />
      <line x1="120" y1="200" x2="140" y2="165" stroke="#3B82F6" strokeWidth="4" />
      <line x1="120" y1="200" x2="140" y2="235" stroke="#3B82F6" strokeWidth="4" />
      <line x1="280" y1="200" x2="260" y2="165" stroke="#3B82F6" strokeWidth="4" />
      <line x1="280" y1="200" x2="260" y2="235" stroke="#3B82F6" strokeWidth="4" />
      <line x1="200" y1="290" x2="165" y2="260" stroke="#3B82F6" strokeWidth="4" />
      <line x1="200" y1="290" x2="235" y2="260" stroke="#3B82F6" strokeWidth="4" />
      
      {/* Center to main nodes */}
      <line x1="200" y1="200" x2="200" y2="110" stroke="#3B82F6" strokeWidth="3" />
      <line x1="200" y1="200" x2="200" y2="290" stroke="#3B82F6" strokeWidth="3" />
      <line x1="200" y1="200" x2="120" y2="200" stroke="#3B82F6" strokeWidth="3" />
      <line x1="200" y1="200" x2="280" y2="200" stroke="#3B82F6" strokeWidth="3" />
      
      {/* Center to inner nodes */}
      <line x1="200" y1="200" x2="165" y2="140" stroke="#3B82F6" strokeWidth="2.5" />
      <line x1="200" y1="200" x2="235" y2="140" stroke="#3B82F6" strokeWidth="2.5" />
      <line x1="200" y1="200" x2="165" y2="260" stroke="#3B82F6" strokeWidth="2.5" />
      <line x1="200" y1="200" x2="235" y2="260" stroke="#3B82F6" strokeWidth="2.5" />
      <line x1="200" y1="200" x2="140" y2="165" stroke="#3B82F6" strokeWidth="2.5" />
      <line x1="200" y1="200" x2="140" y2="235" stroke="#3B82F6" strokeWidth="2.5" />
      <line x1="200" y1="200" x2="260" y2="165" stroke="#3B82F6" strokeWidth="2.5" />
      <line x1="200" y1="200" x2="260" y2="235" stroke="#3B82F6" strokeWidth="2.5" />
      
      {/* Cross connections for structural integrity */}
      <line x1="165" y1="140" x2="235" y2="260" stroke="#3B82F6" strokeWidth="2" />
      <line x1="235" y1="140" x2="165" y2="260" stroke="#3B82F6" strokeWidth="2" />
      <line x1="140" y1="165" x2="260" y2="235" stroke="#3B82F6" strokeWidth="2" />
      <line x1="260" y1="165" x2="140" y2="235" stroke="#3B82F6" strokeWidth="2" />
      
      {/* Outer connections */}
      <line x1="200" y1="80" x2="200" y2="110" stroke="#3B82F6" strokeWidth="2" />
      <line x1="200" y1="320" x2="200" y2="290" stroke="#3B82F6" strokeWidth="2" />
      <line x1="95" y1="200" x2="120" y2="200" stroke="#3B82F6" strokeWidth="2" />
      <line x1="305" y1="200" x2="280" y2="200" stroke="#3B82F6" strokeWidth="2" />
      <line x1="320" y1="260" x2="280" y2="200" stroke="#3B82F6" strokeWidth="3" />
      <line x1="320" y1="260" x2="260" y2="235" stroke="#3B82F6" strokeWidth="2" />
      <line x1="320" y1="140" x2="280" y2="200" stroke="#3B82F6" strokeWidth="2" />
      <line x1="320" y1="140" x2="260" y2="165" stroke="#3B82F6" strokeWidth="2" />
      
      {/* Connecting to floating dots */}
      <line x1="350" y1="280" x2="320" y2="260" stroke="#3B82F6" strokeWidth="2" />
      <line x1="340" y1="100" x2="320" y2="140" stroke="#3B82F6" strokeWidth="1.5" />
      <line x1="350" y1="140" x2="320" y2="140" stroke="#3B82F6" strokeWidth="1.5" />
      
      {/* Inner polygon structure */}
      <line x1="165" y1="140" x2="140" y2="165" stroke="#3B82F6" strokeWidth="2" />
      <line x1="235" y1="140" x2="260" y2="165" stroke="#3B82F6" strokeWidth="2" />
      <line x1="165" y1="260" x2="140" y2="235" stroke="#3B82F6" strokeWidth="2" />
      <line x1="235" y1="260" x2="260" y2="235" stroke="#3B82F6" strokeWidth="2" />
      
      {/* Secondary connections for completeness */}
      <line x1="165" y1="140" x2="165" y2="260" stroke="#3B82F6" strokeWidth="1.5" opacity="0.7" />
      <line x1="235" y1="140" x2="235" y2="260" stroke="#3B82F6" strokeWidth="1.5" opacity="0.7" />
      <line x1="140" y1="165" x2="140" y2="235" stroke="#3B82F6" strokeWidth="1.5" opacity="0.7" />
      <line x1="260" y1="165" x2="260" y2="235" stroke="#3B82F6" strokeWidth="1.5" opacity="0.7" />
    </svg>
  );
};

export default OmegaLogo;