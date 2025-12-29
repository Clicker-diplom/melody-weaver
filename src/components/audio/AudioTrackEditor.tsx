import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Scissors, Copy, Trash2, Plus, Play, Pause, ChevronDown, ChevronUp,
  Volume2, VolumeX, GripVertical, Move, RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface AudioRegion {
  id: string;
  startTime: number; // Start time in the source buffer (seconds)
  endTime: number;   // End time in the source buffer (seconds)
  startBeat: number; // Where to place in timeline (beats)
  color: string;
  label?: string;
}

export interface AudioTrackData {
  id: string;
  name: string;
  file: File;
  buffer: AudioBuffer;
  volume: number;
  muted: boolean;
  regions: AudioRegion[];
}

interface AudioTrackEditorProps {
  track: AudioTrackData;
  bpm: number;
  totalBeats: number;
  currentBeat: number;
  isPlaying: boolean;
  audioContext: AudioContext | null;
  masterGain: GainNode | null;
  onUpdate: (track: AudioTrackData) => void;
  onDelete: () => void;
  onPlayRegion: (region: AudioRegion) => void;
}

const AudioTrackEditor = ({
  track,
  bpm,
  totalBeats,
  currentBeat,
  isPlaying,
  audioContext,
  masterGain,
  onUpdate,
  onDelete,
  onPlayRegion,
}: AudioTrackEditorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [previewSource, setPreviewSource] = useState<AudioBufferSourceNode | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const beatDuration = 60 / bpm;
  const totalDuration = track.buffer.duration;
  
  // Generate random color for regions
  const generateColor = () => {
    const hues = [187, 328, 25, 142, 270, 200, 340];
    const hue = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${hue}, 70%, 55%)`;
  };
  
  // Draw source waveform with selection
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'hsl(var(--muted) / 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    const channelData = track.buffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    
    ctx.beginPath();
    ctx.strokeStyle = 'hsl(var(--primary) / 0.6)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < width; i++) {
      const start = i * step;
      let min = 1.0;
      let max = -1.0;
      
      for (let j = 0; j < step; j++) {
        const datum = channelData[start + j] || 0;
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      const y1 = ((1 + min) / 2) * height;
      const y2 = ((1 + max) / 2) * height;
      
      ctx.moveTo(i, y1);
      ctx.lineTo(i, y2);
    }
    ctx.stroke();
    
    // Draw existing regions
    track.regions.forEach(region => {
      const startX = (region.startTime / totalDuration) * width;
      const endX = (region.endTime / totalDuration) * width;
      
      ctx.fillStyle = region.id === selectedRegion 
        ? region.color.replace('55%', '65%') 
        : region.color.replace(')', ' / 0.3)').replace('hsl', 'hsla');
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Region border
      ctx.strokeStyle = region.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, 0, endX - startX, height);
    });
    
    // Draw selection range
    if (selectionStart !== null && selectionEnd !== null) {
      const startX = Math.min(selectionStart, selectionEnd);
      const endX = Math.max(selectionStart, selectionEnd);
      
      ctx.fillStyle = 'hsl(var(--primary) / 0.3)';
      ctx.fillRect(startX, 0, endX - startX, height);
      
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(startX, 0, endX - startX, height);
      ctx.setLineDash([]);
    }
    
    // Time markers
    const markerInterval = Math.ceil(totalDuration / 10);
    ctx.fillStyle = 'hsl(var(--muted-foreground))';
    ctx.font = '10px monospace';
    
    for (let t = 0; t <= totalDuration; t += markerInterval) {
      const x = (t / totalDuration) * width;
      ctx.fillText(formatTime(t), x + 2, height - 4);
    }
  }, [track.buffer, track.regions, selectedRegion, selectionStart, selectionEnd, totalDuration]);
  
  // Draw timeline with placed regions
  useEffect(() => {
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = 'hsl(var(--muted) / 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Beat grid
    const beatWidth = width / totalBeats;
    
    for (let i = 0; i <= totalBeats; i++) {
      const x = i * beatWidth;
      ctx.strokeStyle = i % 4 === 0 
        ? 'hsl(var(--border))' 
        : 'hsl(var(--border) / 0.3)';
      ctx.lineWidth = i % 4 === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Beat numbers
      if (i % 4 === 0) {
        ctx.fillStyle = 'hsl(var(--muted-foreground))';
        ctx.font = '10px monospace';
        ctx.fillText(`${i / 4 + 1}`, x + 2, 12);
      }
    }
    
    // Draw placed regions
    track.regions.forEach(region => {
      const regionDuration = region.endTime - region.startTime;
      const regionBeats = regionDuration / beatDuration;
      const startX = region.startBeat * beatWidth;
      const regionWidth = regionBeats * beatWidth;
      
      // Region block
      ctx.fillStyle = region.id === selectedRegion
        ? region.color.replace('55%', '65%')
        : region.color.replace(')', ' / 0.5)').replace('hsl', 'hsla');
      ctx.fillRect(startX, 20, regionWidth, height - 25);
      
      // Border
      ctx.strokeStyle = region.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, 20, regionWidth, height - 25);
      
      // Label
      ctx.fillStyle = 'hsl(var(--foreground))';
      ctx.font = '11px sans-serif';
      const label = region.label || `${formatTime(region.startTime)}-${formatTime(region.endTime)}`;
      ctx.fillText(label, startX + 4, 35, regionWidth - 8);
    });
    
    // Playhead
    if (currentBeat >= 0) {
      const playheadX = (currentBeat / totalBeats) * width;
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }
  }, [track.regions, totalBeats, currentBeat, beatDuration, selectedRegion]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle waveform mouse events
  const handleWaveformMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Check if clicking on a region
    const clickedRegion = track.regions.find(region => {
      const startX = (region.startTime / totalDuration) * canvas.width;
      const endX = (region.endTime / totalDuration) * canvas.width;
      return x >= startX && x <= endX;
    });
    
    if (clickedRegion) {
      setSelectedRegion(clickedRegion.id);
    } else {
      setIsSelectingRange(true);
      setSelectionStart(x);
      setSelectionEnd(x);
      setSelectedRegion(null);
    }
  }, [track.regions, totalDuration]);
  
  const handleWaveformMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingRange) return;
    
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
    setSelectionEnd(x);
  }, [isSelectingRange]);
  
  const handleWaveformMouseUp = useCallback(() => {
    setIsSelectingRange(false);
  }, []);
  
  // Create region from selection
  const createRegionFromSelection = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || selectionStart === null || selectionEnd === null) return;
    
    const startX = Math.min(selectionStart, selectionEnd);
    const endX = Math.max(selectionStart, selectionEnd);
    
    if (endX - startX < 10) {
      toast.error('Выделите более длинный участок');
      return;
    }
    
    const startTime = (startX / canvas.width) * totalDuration;
    const endTime = (endX / canvas.width) * totalDuration;
    
    // Find the next available beat position
    const maxEndBeat = track.regions.reduce((max, r) => {
      const regionDuration = r.endTime - r.startTime;
      const regionBeats = regionDuration / beatDuration;
      return Math.max(max, r.startBeat + regionBeats);
    }, 0);
    
    const newRegion: AudioRegion = {
      id: `region-${Date.now()}`,
      startTime,
      endTime,
      startBeat: Math.ceil(maxEndBeat),
      color: generateColor(),
    };
    
    onUpdate({
      ...track,
      regions: [...track.regions, newRegion],
    });
    
    setSelectionStart(null);
    setSelectionEnd(null);
    toast.success('Фрагмент добавлен');
  }, [selectionStart, selectionEnd, totalDuration, track, beatDuration, onUpdate]);
  
  // Delete selected region
  const deleteSelectedRegion = useCallback(() => {
    if (!selectedRegion) return;
    
    onUpdate({
      ...track,
      regions: track.regions.filter(r => r.id !== selectedRegion),
    });
    setSelectedRegion(null);
    toast.success('Фрагмент удалён');
  }, [selectedRegion, track, onUpdate]);
  
  // Duplicate selected region
  const duplicateSelectedRegion = useCallback(() => {
    if (!selectedRegion) return;
    
    const region = track.regions.find(r => r.id === selectedRegion);
    if (!region) return;
    
    const regionDuration = region.endTime - region.startTime;
    const regionBeats = regionDuration / beatDuration;
    
    const newRegion: AudioRegion = {
      ...region,
      id: `region-${Date.now()}`,
      startBeat: region.startBeat + regionBeats,
    };
    
    onUpdate({
      ...track,
      regions: [...track.regions, newRegion],
    });
    toast.success('Фрагмент дублирован');
  }, [selectedRegion, track, beatDuration, onUpdate]);
  
  // Move region on timeline
  const moveRegion = useCallback((regionId: string, newStartBeat: number) => {
    onUpdate({
      ...track,
      regions: track.regions.map(r => 
        r.id === regionId ? { ...r, startBeat: Math.max(0, newStartBeat) } : r
      ),
    });
  }, [track, onUpdate]);
  
  // Handle timeline click to move region
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedRegion) return;
    
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const beat = Math.floor((x / canvas.width) * totalBeats);
    
    moveRegion(selectedRegion, beat);
  }, [selectedRegion, totalBeats, moveRegion]);
  
  // Preview region
  const previewRegion = useCallback((region: AudioRegion) => {
    if (!audioContext || !masterGain) return;
    
    // Stop existing preview
    if (previewSource) {
      try { previewSource.stop(); } catch {}
    }
    
    const source = audioContext.createBufferSource();
    source.buffer = track.buffer;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = track.volume / 100;
    
    source.connect(gainNode);
    gainNode.connect(masterGain);
    
    const duration = region.endTime - region.startTime;
    source.start(0, region.startTime, duration);
    setPreviewSource(source);
    setIsPreviewPlaying(true);
    
    source.onended = () => {
      setIsPreviewPlaying(false);
      setPreviewSource(null);
    };
  }, [audioContext, masterGain, track.buffer, track.volume, previewSource]);
  
  // Stop preview
  const stopPreview = useCallback(() => {
    if (previewSource) {
      try { previewSource.stop(); } catch {}
      setPreviewSource(null);
      setIsPreviewPlaying(false);
    }
  }, [previewSource]);
  
  // Reset to single full region
  const resetToFullTrack = useCallback(() => {
    onUpdate({
      ...track,
      regions: [{
        id: `region-${Date.now()}`,
        startTime: 0,
        endTime: track.buffer.duration,
        startBeat: 0,
        color: generateColor(),
        label: 'Полный трек',
      }],
    });
    toast.success('Сброшено к полному треку');
  }, [track, onUpdate]);

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-8 h-8 rounded bg-gradient-to-br from-secondary/30 to-primary/30 flex items-center justify-center">
          <GripVertical className="h-4 w-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{track.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatTime(totalDuration)} • {track.regions.length} фрагмент(ов)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ ...track, muted: !track.muted });
            }}
            className={cn(
              'p-1.5 rounded transition-colors',
              track.muted 
                ? 'text-destructive bg-destructive/10' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {track.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          
          <div onClick={e => e.stopPropagation()} className="w-20">
            <Slider
              value={[track.volume]}
              onValueChange={([v]) => onUpdate({ ...track, volume: v })}
              max={100}
              step={1}
            />
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {/* Expanded Editor */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* Source Waveform */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Исходный аудио</h4>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={createRegionFromSelection}
                  disabled={selectionStart === null || selectionEnd === null}
                  className="gap-1 h-7 text-xs"
                >
                  <Scissors className="h-3 w-3" />
                  Вырезать
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToFullTrack}
                  className="gap-1 h-7 text-xs"
                >
                  <RotateCcw className="h-3 w-3" />
                  Сбросить
                </Button>
              </div>
            </div>
            
            <canvas
              ref={waveformCanvasRef}
              width={700}
              height={80}
              className="w-full h-20 rounded-lg cursor-crosshair"
              onMouseDown={handleWaveformMouseDown}
              onMouseMove={handleWaveformMouseMove}
              onMouseUp={handleWaveformMouseUp}
              onMouseLeave={handleWaveformMouseUp}
            />
            
            <p className="text-xs text-muted-foreground mt-1">
              Выделите участок мышью для создания фрагмента
            </p>
          </div>
          
          {/* Region Controls */}
          {selectedRegion && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              <span className="text-sm text-muted-foreground">Выбран фрагмент:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const region = track.regions.find(r => r.id === selectedRegion);
                  if (region) {
                    if (isPreviewPlaying) {
                      stopPreview();
                    } else {
                      previewRegion(region);
                    }
                  }
                }}
                className="gap-1 h-7"
              >
                {isPreviewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                Прослушать
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={duplicateSelectedRegion}
                className="gap-1 h-7"
              >
                <Copy className="h-3 w-3" />
                Дублировать
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteSelectedRegion}
                className="gap-1 h-7 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Удалить
              </Button>
            </div>
          )}
          
          {/* Timeline with placed regions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Move className="h-4 w-4 text-primary" />
                Таймлайн
              </h4>
              <p className="text-xs text-muted-foreground">
                Кликните для перемещения выбранного фрагмента
              </p>
            </div>
            
            <canvas
              ref={timelineCanvasRef}
              width={700}
              height={60}
              className="w-full h-[60px] rounded-lg cursor-pointer"
              onClick={handleTimelineClick}
            />
          </div>
          
          {/* Region List */}
          {track.regions.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium mb-2">Фрагменты</h4>
              {track.regions.map((region, index) => (
                <div 
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
                    selectedRegion === region.id 
                      ? 'bg-primary/20 ring-1 ring-primary' 
                      : 'bg-muted/20 hover:bg-muted/40'
                  )}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: region.color }}
                  />
                  <span className="text-sm font-mono">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(region.startTime)} → {formatTime(region.endTime)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    @ такт {Math.floor(region.startBeat / 4) + 1}:{(region.startBeat % 4) + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioTrackEditor;
