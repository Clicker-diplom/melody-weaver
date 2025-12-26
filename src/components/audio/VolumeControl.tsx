import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VolumeControlProps {
  volume: number;
  onChange: (volume: number) => void;
  muted?: boolean;
  onMuteToggle?: () => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

const VolumeControl = ({
  volume,
  onChange,
  muted = false,
  onMuteToggle,
  className,
  orientation = 'horizontal',
}: VolumeControlProps) => {
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        orientation === 'vertical' && 'flex-col-reverse',
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onMuteToggle}
        className={cn(
          'text-muted-foreground hover:text-foreground transition-colors',
          muted && 'text-destructive hover:text-destructive'
        )}
      >
        <VolumeIcon className="h-4 w-4" />
      </Button>

      <div className={cn(
        orientation === 'horizontal' ? 'w-24' : 'h-24',
        'relative'
      )}>
        <Slider
          variant="cyan"
          value={[muted ? 0 : volume]}
          min={0}
          max={100}
          step={1}
          onValueChange={([v]) => onChange(v)}
          orientation={orientation}
          className={cn(
            orientation === 'vertical' && 'h-full'
          )}
        />
      </div>

      <span className="text-xs font-mono text-muted-foreground w-8 text-right">
        {muted ? '—' : `${volume}%`}
      </span>
    </div>
  );
};

export default VolumeControl;
