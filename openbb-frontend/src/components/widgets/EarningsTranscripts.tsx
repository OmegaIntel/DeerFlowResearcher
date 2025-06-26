import React, { useState, useMemo } from 'react';
import { RefreshCw, Download, Settings, Maximize2, ChevronDown } from 'lucide-react';
import { useEarningsTranscriptRealTime, useEarningsTranscriptDatesRealTime } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import classNames from 'classnames';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

interface EarningsTranscriptsProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

interface TranscriptData {
  symbol: string;
  quarter: number;
  year: number;
  date: string;
  content: string;
  provider: string;
  error?: string;
}

const EarningsTranscripts: React.FC<EarningsTranscriptsProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(2);
  const [hasAutoSelected, setHasAutoSelected] = useState<boolean>(false);

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, [currentYear]);

  const quarterOptions = [1, 2, 3, 4];

  // Hooks for data fetching
  const { data: availableDates, isLoading: datesLoading } = useEarningsTranscriptDatesRealTime(ticker);
  const { data: transcript, isLoading: transcriptLoading, error: transcriptError, refetch } = useEarningsTranscriptRealTime(ticker, selectedYear, selectedQuarter);
  const { addWidgetContext } = useCopilot();


  // Auto-select the most recent available transcript when dates load (only once)
  React.useEffect(() => {
    if (availableDates && availableDates.length > 0 && !hasAutoSelected) {
      const latest = availableDates[0];
      setSelectedYear(latest.year);
      setSelectedQuarter(latest.quarter);
      setHasAutoSelected(true);
    }
  }, [availableDates, hasAutoSelected]);

  // Reset auto-selection when ticker changes
  React.useEffect(() => {
    setHasAutoSelected(false);
  }, [ticker]);

  const isLoading = datesLoading || transcriptLoading;
  const error = (transcriptError instanceof Error ? transcriptError.message : transcriptError) || 
                (transcript && 'error' in transcript ? transcript.error : null);

  // Debug logging
  console.log('EarningsTranscripts Debug:', {
    datesLoading,
    transcriptLoading,
    isLoading,
    hasTranscript: !!transcript,
    transcriptContent: transcript?.content ? 'exists' : 'missing',
    error,
    selectedYear,
    selectedQuarter
  });

  // Parse transcript content to separate speakers and text
  const parsedTranscript = useMemo(() => {
    if (!transcript?.content) return [];
    
    const lines = transcript.content.split('\n').filter(line => line.trim());
    const parsed: { speaker: string; text: string }[] = [];
    
    let currentSpeaker = '';
    let currentText = '';
    
    for (const line: string of lines) {
      // Check if line is a speaker (ends with :)
      if (line.includes(':') && !line.startsWith(' ')) {
        // Save previous speaker's text if exists
        if (currentSpeaker && currentText) {
          parsed.push({
            speaker: currentSpeaker,
            text: currentText.trim()
          });
        }
        
        // Start new speaker
        const [speaker, ...rest] = line.split(':');
        currentSpeaker = speaker.trim();
        currentText = rest.join(':').trim();
      } else {
        // Continue current speaker's text
        currentText += ' ' + line.trim();
      }
    }
    
    // Add the last speaker
    if (currentSpeaker && currentText) {
      parsed.push({
        speaker: currentSpeaker,
        text: currentText.trim()
      });
    }
    
    return parsed;
  }, [transcript]);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="h-full bg-openbb-bg-widget border border-openbb-border flex flex-col">
      <WidgetHeaderWithTicker
        title="Earnings Transcripts"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => addWidgetContext(WidgetType.EARNINGS_TRANSCRIPTS, transcript, ticker, 'Earnings Transcripts')}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      {/* Controls Header */}
      <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          {transcript && transcript.content && !error ? (
            <span className="text-xs text-openbb-accent  bg-openbb-bg-hover px-2 py-1 rounded">LIVE</span>
          ) : (
            <span className="text-xs text-yellow-500  bg-openbb-bg-hover px-2 py-1 rounded">DEMO</span>
          )}
          
          {/* Year Selector */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none bg-openbb-bg-hover border border-openbb-border rounded px-3 py-1 text-xs text-openbb-text-primary  cursor-pointer hover:bg-openbb-bg-tertiary transition-colors pr-8"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-openbb-text-muted pointer-events-none" />
          </div>
          
          {/* Quarter Buttons */}
          <div className="flex items-center gap-1">
            {quarterOptions.map(quarter => (
              <button
                key={quarter}
                onClick={() => setSelectedQuarter(quarter)}
                className={classNames(
                  'px-2 py-1 text-xs  rounded transition-colors',
                  selectedQuarter === quarter
                    ? 'bg-openbb-accent text-openbb-bg-primary'
                    : 'text-openbb-text-secondary hover:text-openbb-text-primary hover:bg-openbb-bg-hover'
                )}
              >
                Q{quarter}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={() => refetch()}
            className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
            disabled={isLoading}
          >
            <RefreshCw className={classNames("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openbb-accent mx-auto mb-4"></div>
              <p className="text-openbb-text-muted  text-sm">Loading transcript...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <p className="text-openbb-text-muted  text-sm">{String(error)}</p>
              <p className="text-openbb-text-muted  text-xs mt-2">
                Try selecting a different quarter or year
              </p>
            </div>
          </div>
        ) : transcript && transcript.content ? (
          <>
            {/* Date Header */}
            {transcript.date && (
              <div className="p-3 border-b border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
                <p className="text-sm text-openbb-text-primary  font-medium">
                  {formatDate(transcript.date)}
                </p>
              </div>
            )}
            
            {/* Scrollable Transcript Content */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {parsedTranscript.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="text-sm font-semibold text-openbb-text-primary ">
                    {item.speaker}:
                  </div>
                  <div className="text-sm text-openbb-text-primary leading-relaxed pl-0 ">
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-openbb-text-muted  text-sm">
              Select a quarter to view earnings transcript
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="p-3">
          <p className="text-xxs text-openbb-text-muted ">
            Earnings transcripts from Financial Modeling Prep • Updated after earnings calls
          </p>
        </div>
      </div>
    </div>
  );
};

export default EarningsTranscripts;