import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { useVoice } from '~/hooks/use-voice';

interface VoiceButtonProps {
  onVoiceCommand?: (command: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceButton({ onVoiceCommand, disabled, className }: VoiceButtonProps) {
  const [isPermissionRequested, setIsPermissionRequested] = useState(false);
  
  const {
    isListening,
    isProcessing,
    hasPermission,
    error,
    transcript,
    isSupported,
    requestPermission,
    startListening,
    stopListening,
    speak,
    cancelSpeech
  } = useVoice({
    onWakeWord: (command) => {
      console.log('[VoiceButton] Wake word detected, command:', command);
      onVoiceCommand?.(command);
    },
    onError: (error) => {
      console.error('[VoiceButton] Voice error:', error);
    },
    wakeWord: 'o',
    silenceTimeout: 5000,
    language: 'en-US'
  });

  // Auto-request permission and start listening when component mounts
  useEffect(() => {
    if (isSupported && !isPermissionRequested && !disabled) {
      setIsPermissionRequested(true);
      requestPermission().then(() => {
        // Auto-start listening after permission is granted
        setTimeout(() => {
          startListening();
        }, 1000);
      });
    }
  }, [isSupported, isPermissionRequested, disabled, requestPermission, startListening]);

  // Handle voice button click
  const handleVoiceToggle = () => {
    if (!hasPermission) {
      requestPermission();
      return;
    }

    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Get button state and styling
  const getButtonState = () => {
    if (!isSupported) {
      return {
        icon: MicOff,
        variant: 'outline' as const,
        title: 'Voice not supported in this browser',
        disabled: true,
        className: 'opacity-50'
      };
    }

    if (!hasPermission) {
      return {
        icon: MicOff,
        variant: 'outline' as const,
        title: 'Click to enable voice input',
        disabled: false,
        className: 'hover:bg-blue-50 hover:border-blue-300'
      };
    }

    if (isProcessing) {
      return {
        icon: Volume2,
        variant: 'default' as const,
        title: 'Processing voice command...',
        disabled: true,
        className: 'bg-orange-500 hover:bg-orange-600 animate-pulse'
      };
    }

    if (isListening) {
      return {
        icon: Mic,
        variant: 'default' as const,
        title: 'Listening for "O" wake word...',
        disabled: false,
        className: 'bg-red-500 hover:bg-red-600 animate-pulse'
      };
    }

    return {
      icon: MicOff,
      variant: 'outline' as const,
      title: 'Click to start voice input',
      disabled: false,
      className: 'hover:bg-green-50 hover:border-green-300'
    };
  };

  const buttonState = getButtonState();
  const Icon = buttonState.icon;

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  return (
    <div className="relative">
      <Button
        variant={buttonState.variant}
        size="icon"
        onClick={handleVoiceToggle}
        disabled={disabled || buttonState.disabled}
        title={buttonState.title}
        className={cn(
          'flex-shrink-0 transition-all duration-200',
          buttonState.className,
          className
        )}
      >
        <Icon className="h-4 w-4" />
      </Button>

      {/* Visual feedback for transcript */}
      {transcript && isListening && (
        <div className="absolute bottom-full right-0 mb-2 max-w-xs">
          <div className="bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap overflow-hidden">
            {transcript.length > 30 ? `...${transcript.slice(-30)}` : transcript}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="absolute bottom-full right-0 mb-2 max-w-xs">
          <div className="bg-red-500 text-white text-xs rounded px-2 py-1">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}

// Voice status indicator component
export function VoiceStatus() {
  const { isListening, isProcessing, hasPermission, isSupported } = useVoice();

  if (!isSupported || !hasPermission) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {isProcessing && (
        <>
          <Volume2 className="h-3 w-3 animate-pulse text-orange-500" />
          <span>Processing...</span>
        </>
      )}
      {isListening && !isProcessing && (
        <>
          <Mic className="h-3 w-3 animate-pulse text-red-500" />
          <span>Listening for "O"...</span>
        </>
      )}
      {!isListening && !isProcessing && (
        <>
          <MicOff className="h-3 w-3 text-gray-400" />
          <span>Voice ready</span>
        </>
      )}
    </div>
  );
}