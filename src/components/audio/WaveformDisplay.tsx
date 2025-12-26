import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface WaveformDisplayProps {
  audioData?: number[];
  isPlaying?: boolean;
  currentTime?: number;
  duration?: number;
  onSeek?: (time: number) => void;
  className?: string;
  showRegions?: boolean;
  selectedRegion?: { start: number; end: number } | null;
  onRegionSelect?: (start: number, end: number) => void;
}

const WaveformDisplay = ({
  audioData,
  isPlaying = false,
  currentTime = 0,
  duration = 100,
  onSeek,
  className,
  showRegions = false,
  selectedRegion,
  onRegionSelect,
}: WaveformDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  // Generate demo waveform data if none provided
  const generateDemoWaveform = () => {
    const samples = 200;
    const data: number[] = [];
    for (let i = 0; i < samples; i++) {
      const baseWave = Math.sin(i * 0.1) * 0.3;
      const noise = (Math.random() - 0.5) * 0.4;
      const envelope = Math.sin((i / samples) * Math.PI) * 0.8;
      const peak = Math.random() > 0.95 ? Math.random() * 0.5 : 0;
      data.push(Math.abs(baseWave + noise + peak) * envelope + 0.1);
    }
    return data;
  };

  const waveformData = audioData || generateDemoWaveform();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const barWidth = rect.width / waveformData.length;
    const centerY = rect.height / 2;
    const maxHeight = rect.height * 0.8;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
    gradient.addColorStop(0, 'hsl(187, 100%, 50%)');
    gradient.addColorStop(0.5, 'hsl(328, 100%, 50%)');
    gradient.addColorStop(1, 'hsl(25, 100%, 60%)');

    const playedGradient = ctx.createLinearGradient(0, 0, rect.width, 0);
    playedGradient.addColorStop(0, 'hsl(187, 100%, 65%)');
    playedGradient.addColorStop(0.5, 'hsl(328, 100%, 65%)');
    playedGradient.addColorStop(1, 'hsl(25, 100%, 70%)');

    // Draw selected region background
    if (selectedRegion) {
      const startX = (selectedRegion.start / duration) * rect.width;
      const endX = (selectedRegion.end / duration) * rect.width;
      ctx.fillStyle = 'hsla(187, 100%, 50%, 0.15)';
      ctx.fillRect(startX, 0, endX - startX, rect.height);
    }

    // Draw waveform bars
    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * maxHeight;
      const progress = currentTime / duration;
      const isPlayed = index / waveformData.length < progress;

      // Bar styling
      ctx.fillStyle = isPlayed ? playedGradient : gradient;
      ctx.globalAlpha = isPlayed ? 1 : 0.5;

      // Draw mirrored bars
      const gap = 1;
      ctx.beginPath();
      ctx.roundRect(x, centerY - barHeight / 2, barWidth - gap, barHeight, 2);
      ctx.fill();
    });

    ctx.globalAlpha = 1;

    // Draw playhead
    const playheadX = (currentTime / duration) * rect.width;
    ctx.strokeStyle = 'hsl(187, 100%, 50%)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'hsl(187, 100%, 50%)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, rect.height);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw hover position
    if (hoverPosition !== null) {
      ctx.strokeStyle = 'hsla(0, 0%, 100%, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(hoverPosition, 0);
      ctx.lineTo(hoverPosition, rect.height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [waveformData, currentTime, duration, isPlaying, selectedRegion, hoverPosition]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !onSeek) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    onSeek(progress * duration);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showRegions || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    setIsSelecting(true);
    setSelectionStart(time);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showRegions || !isSelecting || !containerRef.current || !onRegionSelect) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    setIsSelecting(false);
    if (Math.abs(time - selectionStart) > 0.5) {
      onRegionSelect(Math.min(selectionStart, time), Math.max(selectionStart, time));
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setHoverPosition(x);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-32 rounded-xl overflow-hidden cursor-pointer',
        'bg-gradient-to-b from-muted/30 to-muted/10',
        'border border-border/30',
        className
      )}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Glow effect overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-transparent via-transparent to-glow-cyan/5" />
      
      {/* Time markers */}
      <div className="absolute bottom-2 left-2 font-mono text-xs text-muted-foreground">
        {formatTime(currentTime)}
      </div>
      <div className="absolute bottom-2 right-2 font-mono text-xs text-muted-foreground">
        {formatTime(duration)}
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default WaveformDisplay;
