import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Scissors, Copy, Trash2, Play, Pause, ChevronDown, ChevronUp,
  Volume2, VolumeX, Move, RotateCcw, HelpCircle, MousePointer2, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface AudioRegion {
  id: string;
  startTime: number;
  endTime: number;
  startBeat: number;
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
  audioContext,
  masterGain,
  onUpdate,
  onDelete,
}: AudioTrackEditorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [previewSource, setPreviewSource] = useState<AudioBufferSourceNode | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const beatDuration = 60 / bpm;
  const totalDuration = track.buffer.duration;
  
  const generateColor = () => {
    const hues = [187, 328, 25, 142, 270, 200, 340];
    const hue = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${hue}, 70%, 55%)`;
  };
  
  // Draw source waveform
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'hsla(var(--muted), 0.4)');
    bgGradient.addColorStop(1, 'hsla(var(--muted), 0.2)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    const channelData = track.buffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    
    // Waveform gradient
    const waveGradient = ctx.createLinearGradient(0, 0, 0, height);
    waveGradient.addColorStop(0, 'hsl(var(--primary))');
    waveGradient.addColorStop(0.5, 'hsl(var(--primary) / 0.8)');
    waveGradient.addColorStop(1, 'hsl(var(--primary))');
    
    ctx.beginPath();
    ctx.strokeStyle = waveGradient;
    ctx.lineWidth = 1.5;
    
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
      
      const isSelected = region.id === selectedRegion;
      
      // Region fill
      ctx.fillStyle = isSelected 
        ? region.color.replace('55%', '45%').replace(')', ' / 0.5)').replace('hsl', 'hsla')
        : region.color.replace(')', ' / 0.25)').replace('hsl', 'hsla');
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Region border
      ctx.strokeStyle = region.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(startX, 0, endX - startX, height);
      
      // Region label
      if (endX - startX > 40) {
        ctx.fillStyle = 'hsl(var(--foreground))';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${formatTime(region.startTime)}`, startX + 4, 12);
      }
    });
    
    // Draw selection range with animated border
    if (selectionStart !== null && selectionEnd !== null) {
      const startX = Math.min(selectionStart, selectionEnd);
      const endX = Math.max(selectionStart, selectionEnd);
      
      // Selection fill
      const selGradient = ctx.createLinearGradient(startX, 0, endX, 0);
      selGradient.addColorStop(0, 'hsl(var(--primary) / 0.2)');
      selGradient.addColorStop(0.5, 'hsl(var(--primary) / 0.4)');
      selGradient.addColorStop(1, 'hsl(var(--primary) / 0.2)');
      ctx.fillStyle = selGradient;
      ctx.fillRect(startX, 0, endX - startX, height);
      
      // Selection border
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(startX, 0, endX - startX, height);
      ctx.setLineDash([]);
      
      // Selection time labels
      const selStartTime = (startX / width) * totalDuration;
      const selEndTime = (endX / width) * totalDuration;
      
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(formatTime(selStartTime), startX + 4, height - 6);
      ctx.fillText(formatTime(selEndTime), endX - 30, height - 6);
    }
    
    // Time markers
    const markerCount = Math.min(10, Math.floor(totalDuration));
    const markerInterval = totalDuration / markerCount;
    
    ctx.fillStyle = 'hsl(var(--muted-foreground) / 0.7)';
    ctx.font = '9px monospace';
    
    for (let t = markerInterval; t < totalDuration; t += markerInterval) {
      const x = (t / totalDuration) * width;
      ctx.fillRect(x, height - 3, 1, 3);
    }
  }, [track.buffer, track.regions, selectedRegion, selectionStart, selectionEnd, totalDuration]);
  
  // Draw timeline
  useEffect(() => {
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    
    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, 'hsla(var(--background), 0.8)');
    bgGradient.addColorStop(1, 'hsla(var(--muted), 0.3)');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Beat grid
    const beatWidth = width / totalBeats;
    
    for (let i = 0; i <= totalBeats; i++) {
      const x = i * beatWidth;
      const isMeasure = i % 4 === 0;
      
      ctx.strokeStyle = isMeasure 
        ? 'hsl(var(--border))' 
        : 'hsl(var(--border) / 0.2)';
      ctx.lineWidth = isMeasure ? 1.5 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Measure numbers
      if (isMeasure && i < totalBeats) {
        ctx.fillStyle = 'hsl(var(--muted-foreground))';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${i / 4 + 1}`, x + 3, 12);
      }
    }
    
    // Draw placed regions
    track.regions.forEach((region, idx) => {
      const regionDuration = region.endTime - region.startTime;
      const regionBeats = regionDuration / beatDuration;
      const startX = region.startBeat * beatWidth;
      const regionWidth = Math.max(regionBeats * beatWidth, 20);
      
      const isSelected = region.id === selectedRegion;
      
      // Region shadow
      if (isSelected) {
        ctx.shadowColor = region.color;
        ctx.shadowBlur = 10;
      }
      
      // Region block with gradient
      const regGradient = ctx.createLinearGradient(startX, 0, startX, height);
      regGradient.addColorStop(0, region.color.replace('55%', '60%'));
      regGradient.addColorStop(1, region.color.replace('55%', '45%'));
      ctx.fillStyle = isSelected ? regGradient : region.color.replace(')', ' / 0.7)').replace('hsl', 'hsla');
      
      // Rounded rectangle
      const radius = 4;
      const y = 18;
      const h = height - 22;
      ctx.beginPath();
      ctx.moveTo(startX + radius, y);
      ctx.lineTo(startX + regionWidth - radius, y);
      ctx.quadraticCurveTo(startX + regionWidth, y, startX + regionWidth, y + radius);
      ctx.lineTo(startX + regionWidth, y + h - radius);
      ctx.quadraticCurveTo(startX + regionWidth, y + h, startX + regionWidth - radius, y + h);
      ctx.lineTo(startX + radius, y + h);
      ctx.quadraticCurveTo(startX, y + h, startX, y + h - radius);
      ctx.lineTo(startX, y + radius);
      ctx.quadraticCurveTo(startX, y, startX + radius, y);
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowBlur = 0;
      
      // Border
      ctx.strokeStyle = isSelected ? 'hsl(var(--foreground))' : region.color;
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();
      
      // Region number badge
      ctx.fillStyle = 'hsl(var(--background))';
      ctx.beginPath();
      ctx.arc(startX + 12, y + 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = region.color;
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, startX + 12, y + 16);
      ctx.textAlign = 'left';
    });
    
    // Playhead
    if (currentBeat >= 0) {
      const playheadX = (currentBeat / totalBeats) * width;
      
      // Playhead glow
      ctx.shadowColor = 'hsl(var(--primary))';
      ctx.shadowBlur = 8;
      
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      
      // Playhead triangle
      ctx.fillStyle = 'hsl(var(--primary))';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 10);
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowBlur = 0;
    }
  }, [track.regions, totalBeats, currentBeat, beatDuration, selectedRegion]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };
  
  const handleWaveformMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const clickedRegion = track.regions.find(region => {
      const startX = (region.startTime / totalDuration) * canvas.width;
      const endX = (region.endTime / totalDuration) * canvas.width;
      return x >= startX && x <= endX;
    });
    
    if (clickedRegion) {
      setSelectedRegion(clickedRegion.id);
      toast.info(`Фрагмент выбран`, { duration: 1500 });
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
    setSelectedRegion(newRegion.id);
    toast.success('Фрагмент создан и добавлен на таймлайн');
  }, [selectionStart, selectionEnd, totalDuration, track, beatDuration, onUpdate]);
  
  const deleteSelectedRegion = useCallback(() => {
    if (!selectedRegion) return;
    
    if (track.regions.length <= 1) {
      toast.error('Нельзя удалить последний фрагмент');
      return;
    }
    
    onUpdate({
      ...track,
      regions: track.regions.filter(r => r.id !== selectedRegion),
    });
    setSelectedRegion(null);
    toast.success('Фрагмент удалён');
  }, [selectedRegion, track, onUpdate]);
  
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
    setSelectedRegion(newRegion.id);
    toast.success('Фрагмент дублирован');
  }, [selectedRegion, track, beatDuration, onUpdate]);
  
  const moveRegion = useCallback((regionId: string, newStartBeat: number) => {
    onUpdate({
      ...track,
      regions: track.regions.map(r => 
        r.id === regionId ? { ...r, startBeat: Math.max(0, newStartBeat) } : r
      ),
    });
  }, [track, onUpdate]);
  
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedRegion) {
      toast.info('Сначала выберите фрагмент на волновой форме', { duration: 2000 });
      return;
    }
    
    const canvas = timelineCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const beat = Math.floor((x / canvas.width) * totalBeats);
    
    moveRegion(selectedRegion, beat);
    toast.success(`Фрагмент перемещён на такт ${Math.floor(beat / 4) + 1}:${(beat % 4) + 1}`);
  }, [selectedRegion, totalBeats, moveRegion]);
  
  const previewRegion = useCallback((region: AudioRegion) => {
    if (!audioContext || !masterGain) return;
    
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
  
  const stopPreview = useCallback(() => {
    if (previewSource) {
      try { previewSource.stop(); } catch {}
      setPreviewSource(null);
      setIsPreviewPlaying(false);
    }
  }, [previewSource]);
  
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
    setSelectedRegion(null);
    toast.success('Сброшено к полному треку');
  }, [track, onUpdate]);

  const selectedRegionData = track.regions.find(r => r.id === selectedRegion);
  const hasSelection = selectionStart !== null && selectionEnd !== null && Math.abs(selectionEnd - selectionStart) > 10;

  return (
    <TooltipProvider>
      <div className="glass rounded-xl overflow-hidden transition-all duration-300 hover:ring-1 hover:ring-primary/30">
        {/* Header */}
        <div 
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
            "bg-gradient-to-br from-primary/30 to-secondary/30",
            isExpanded && "from-primary/50 to-secondary/50"
          )}>
            <Layers className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{track.name}</p>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/20 text-primary font-medium">
                {track.regions.length} фраг.
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatTime(totalDuration)} • Кликните для {isExpanded ? 'скрытия' : 'редактирования'}
            </p>
          </div>

          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onUpdate({ ...track, muted: !track.muted })}
                  className={cn(
                    'p-2 rounded-lg transition-all',
                    track.muted 
                      ? 'text-destructive bg-destructive/10' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {track.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{track.muted ? 'Включить звук' : 'Выключить звук'}</TooltipContent>
            </Tooltip>
            
            <div className="w-24">
              <Slider
                value={[track.volume]}
                onValueChange={([v]) => onUpdate({ ...track, volume: v })}
                max={100}
                step={1}
              />
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onDelete}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Удалить трек</TooltipContent>
            </Tooltip>
          </div>
          
          <div className={cn(
            "transition-transform duration-300",
            isExpanded && "rotate-180"
          )}>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        
        {/* Expanded Editor */}
        {isExpanded && (
          <div className="border-t border-border p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
            {/* Help toggle */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <MousePointer2 className="h-4 w-4 text-primary" />
                Редактор фрагментов
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHelp(!showHelp)}
                className={cn("gap-1 h-7 text-xs", showHelp && "bg-primary/10 text-primary")}
              >
                <HelpCircle className="h-3 w-3" />
                {showHelp ? 'Скрыть подсказки' : 'Показать подсказки'}
              </Button>
            </div>
            
            {/* Help panel */}
            {showHelp && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2 text-sm animate-in fade-in duration-200">
                <p className="font-medium text-primary">Как использовать:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li><strong>Выделите участок</strong> — зажмите мышь и проведите по волновой форме</li>
                  <li><strong>Создайте фрагмент</strong> — нажмите кнопку "Вырезать фрагмент"</li>
                  <li><strong>Переместите на таймлайне</strong> — выберите фрагмент и кликните на нужное место</li>
                  <li><strong>Дублируйте</strong> — для повторения одного и того же фрагмента</li>
                </ol>
              </div>
            )}
            
            {/* Source Waveform */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Исходное аудио — выделите участок мышью
                </p>
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={hasSelection ? "default" : "ghost"}
                        size="sm"
                        onClick={createRegionFromSelection}
                        disabled={!hasSelection}
                        className="gap-1 h-7 text-xs"
                      >
                        <Scissors className="h-3 w-3" />
                        Вырезать фрагмент
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Создать фрагмент из выделенного участка</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetToFullTrack}
                        className="gap-1 h-7 text-xs"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Сбросить
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Вернуть один фрагмент с полным треком</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              
              <canvas
                ref={waveformCanvasRef}
                width={700}
                height={90}
                className="w-full h-[90px] rounded-lg cursor-crosshair border border-border/50 transition-all hover:border-primary/30"
                onMouseDown={handleWaveformMouseDown}
                onMouseMove={handleWaveformMouseMove}
                onMouseUp={handleWaveformMouseUp}
                onMouseLeave={handleWaveformMouseUp}
              />
            </div>
            
            {/* Selected Region Controls */}
            {selectedRegionData && (
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-offset-background" 
                    style={{ backgroundColor: selectedRegionData.color, boxShadow: `0 0 8px ${selectedRegionData.color}` }}
                  />
                  <span className="text-sm font-medium">Фрагмент выбран</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatTime(selectedRegionData.startTime)} → {formatTime(selectedRegionData.endTime)})
                  </span>
                </div>
                
                <div className="flex items-center gap-1 ml-auto">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (isPreviewPlaying) stopPreview();
                          else previewRegion(selectedRegionData);
                        }}
                        className="gap-1 h-8"
                      >
                        {isPreviewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        {isPreviewPlaying ? 'Стоп' : 'Прослушать'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Прослушать выбранный фрагмент</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={duplicateSelectedRegion}
                        className="gap-1 h-8"
                      >
                        <Copy className="h-4 w-4" />
                        Дублировать
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Создать копию фрагмента</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deleteSelectedRegion}
                        className="gap-1 h-8 text-destructive hover:text-destructive"
                        disabled={track.regions.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                        Удалить
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {track.regions.length <= 1 ? 'Нельзя удалить последний фрагмент' : 'Удалить фрагмент'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )}
            
            {/* Timeline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  Таймлайн — кликните чтобы переместить выбранный фрагмент
                </p>
              </div>
              
              <canvas
                ref={timelineCanvasRef}
                width={700}
                height={70}
                className={cn(
                  "w-full h-[70px] rounded-lg border border-border/50 transition-all",
                  selectedRegion ? "cursor-pointer hover:border-primary/50" : "cursor-default"
                )}
                onClick={handleTimelineClick}
              />
            </div>
            
            {/* Region List */}
            {track.regions.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Все фрагменты ({track.regions.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {track.regions.map((region, index) => (
                    <button 
                      key={region.id}
                      onClick={() => setSelectedRegion(region.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                        selectedRegion === region.id 
                          ? 'ring-2 ring-offset-2 ring-offset-background' 
                          : 'hover:opacity-80'
                      )}
                      style={{ 
                        backgroundColor: `${region.color}20`,
                        borderColor: region.color,
                        color: region.color,
                        ['--tw-ring-color' as string]: region.color,
                      }}
                    >
                      <span className="font-bold">#{index + 1}</span>
                      <span className="opacity-80">
                        {formatTime(region.startTime)} - {formatTime(region.endTime)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AudioTrackEditor;
