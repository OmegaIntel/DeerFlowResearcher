'use client';

import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

interface VoiceButtonStaticProps {
  className?: string;
  onClick?: () => void;
}

export function VoiceButtonStatic({ className, onClick }: VoiceButtonStaticProps) {
  const [isActive, setIsActive] = React.useState(false);
  
  const handleClick = () => {
    setIsActive(!isActive);
    onClick?.();
    console.log('[VoiceButtonStatic] Clicked, active:', !isActive);
  };
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative transition-all",
        isActive && "text-red-500",
        className
      )}
      onClick={handleClick}
      title="Voice input (click to toggle)"
    >
      {isActive ? (
        <Mic className="h-4 w-4" />
      ) : (
        <MicOff className="h-4 w-4" />
      )}
    </Button>
  );
}