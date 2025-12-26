import { useState } from 'react';
import { Scissors, Copy, Trash2, Plus, Minus, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimelineRegion {
  id: string;
  start: number;
  end: number;
  color: string;
  label?: string;
}

interface TimelineProps {
  duration: number;
  currentTime: number;
  regions?: TimelineRegion[];
  selectedRegion?: string | null;
  onSeek?: (time: number) => void;
  onRegionSelect?: (id: string | null) => void;
  onCut?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onAddPause?: () => void;
  className?: string;
}

const Timeline = ({
  duration,
  currentTime,
  regions = [],
  selectedRegion,
  onSeek,
  onRegionSelect,
  onCut,
  onCopy,
  onDelete,
  onAddPause,
  className,
}: TimelineProps) => {
  const [zoom, setZoom] = useState(1);

  // Generate time markers
  const markerInterval = duration > 120 ? 30 : duration > 60 ? 15 : 10;
  const markers = [];
  for (let t = 0; t <= duration; t += markerInterval) {
    markers.push(t);
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    onSeek(progress * duration);
  };

  return (
    <div className={cn('glass rounded-xl p-4', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="icon-sm"
            onClick={onCut}
            disabled={!selectedRegion}
            title="Вырезать"
          >
            <Scissors className="h-4 w-4" />
          </Button>
          <Button
            variant="glass"
            size="icon-sm"
            onClick={onCopy}
            disabled={!selectedRegion}
            title="Копировать"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="glass"
            size="icon-sm"
            onClick={onDelete}
            disabled={!selectedRegion}
            title="Удалить"
            className="hover:text-destructive hover:border-destructive/50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button
            variant="glass"
            size="icon-sm"
            onClick={onAddPause}
            title="Добавить паузу"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-mono text-muted-foreground w-12 text-center">
            {(zoom * 100).toFixed(0)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Timeline ruler */}
      <div className="relative overflow-x-auto">
        <div
          className="relative h-8 bg-muted/30 rounded-lg mb-2"
          style={{ width: `${100 * zoom}%`, minWidth: '100%' }}
        >
          {markers.map(time => (
            <div
              key={time}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${(time / duration) * 100}%` }}
            >
              <div className="w-px h-3 bg-border" />
              <span className="text-[10px] font-mono text-muted-foreground mt-0.5">
                {formatTime(time)}
              </span>
            </div>
          ))}
        </div>

        {/* Track area */}
        <div
          className="relative h-16 bg-muted/20 rounded-lg cursor-pointer overflow-hidden"
          style={{ width: `${100 * zoom}%`, minWidth: '100%' }}
          onClick={handleTimelineClick}
        >
          {/* Regions */}
          {regions.map(region => (
            <div
              key={region.id}
              className={cn(
                'absolute top-1 bottom-1 rounded-md cursor-pointer transition-all duration-150',
                'hover:brightness-110',
                selectedRegion === region.id && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
              )}
              style={{
                left: `${(region.start / duration) * 100}%`,
                width: `${((region.end - region.start) / duration) * 100}%`,
                backgroundColor: region.color,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onRegionSelect?.(region.id === selectedRegion ? null : region.id);
              }}
            >
              {region.label && (
                <span className="absolute top-1 left-2 text-[10px] font-medium text-white/80 truncate max-w-full px-1">
                  {region.label}
                </span>
              )}
            </div>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
            style={{
              left: `${(currentTime / duration) * 100}%`,
              boxShadow: '0 0 10px hsl(var(--primary))',
            }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-primary rotate-45" />
          </div>

          {/* Grid lines */}
          {markers.map(time => (
            <div
              key={`grid-${time}`}
              className="absolute top-0 bottom-0 w-px bg-border/30"
              style={{ left: `${(time / duration) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
