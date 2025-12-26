import { Play, Pause, Square, SkipBack, SkipForward, Circle, Repeat, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransportControlsProps {
  isPlaying: boolean;
  isRecording?: boolean;
  isLooping?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onRecord?: () => void;
  onToggleLoop?: () => void;
  className?: string;
}

const TransportControls = ({
  isPlaying,
  isRecording = false,
  isLooping = false,
  onPlay,
  onPause,
  onStop,
  onSkipBack,
  onSkipForward,
  onRecord,
  onToggleLoop,
  className,
}: TransportControlsProps) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Skip Back */}
      {onSkipBack && (
        <Button
          variant="transport"
          size="icon"
          onClick={onSkipBack}
          className="group"
        >
          <SkipBack className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        </Button>
      )}

      {/* Stop */}
      <Button
        variant="transport"
        size="icon"
        onClick={onStop}
        className="group"
      >
        <Square className="h-4 w-4 transition-transform group-hover:scale-90" />
      </Button>

      {/* Play/Pause */}
      <Button
        variant={isPlaying ? 'transport-active' : 'transport'}
        size="icon-lg"
        onClick={isPlaying ? onPause : onPlay}
        className={cn(
          'relative transition-all duration-300',
          isPlaying && 'glow-cyan'
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
        
        {/* Animated ring when playing */}
        {isPlaying && (
          <span className="absolute inset-0 rounded-lg border-2 border-primary animate-ping opacity-20" />
        )}
      </Button>

      {/* Skip Forward */}
      {onSkipForward && (
        <Button
          variant="transport"
          size="icon"
          onClick={onSkipForward}
          className="group"
        >
          <SkipForward className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      )}

      {/* Record */}
      {onRecord && (
        <Button
          variant={isRecording ? 'transport-record-active' : 'transport-record'}
          size="icon"
          onClick={onRecord}
          className="ml-2"
        >
          <Circle className={cn('h-4 w-4', isRecording && 'fill-current')} />
        </Button>
      )}

      {/* Loop Toggle */}
      {onToggleLoop && (
        <Button
          variant={isLooping ? 'transport-active' : 'transport'}
          size="icon"
          onClick={onToggleLoop}
          className="ml-2"
        >
          <Repeat className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default TransportControls;
