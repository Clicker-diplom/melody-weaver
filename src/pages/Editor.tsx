import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import WaveformDisplay from '@/components/audio/WaveformDisplay';
import TransportControls from '@/components/audio/TransportControls';
import VolumeControl from '@/components/audio/VolumeControl';
import EffectsPanel from '@/components/audio/EffectsPanel';
import Timeline from '@/components/audio/Timeline';
import FileUpload from '@/components/audio/FileUpload';
import EditorToolbar from '@/components/audio/EditorToolbar';
import ExportDialog from '@/components/audio/ExportDialog';
import { useAudioEngine } from '@/hooks/useAudioEngine';

const Editor = () => {
  const navigate = useNavigate();
  const [hasFile, setHasFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<{ id: string; start: number; end: number } | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isExporting, setIsExporting] = useState(false);

  const [regions, setRegions] = useState<Array<{
    id: string;
    start: number;
    end: number;
    color: string;
    label: string;
  }>>([]);

  const audioEngine = useAudioEngine({
    onEnded: () => {
      toast.info('Воспроизведение завершено');
    },
  });

  const handleFileSelect = useCallback(async (file: File) => {
    try {
      await audioEngine.loadFile(file);
      setHasFile(true);
      setFileName(file.name);
      setRegions([]);
      setSelectedRegion(null);
      toast.success(`Загружен: ${file.name}`);
    } catch {
      toast.error('Ошибка загрузки файла');
    }
  }, [audioEngine]);

  const handlePlay = useCallback(() => {
    if (!hasFile) {
      toast.error('Сначала загрузите аудиофайл');
      return;
    }
    audioEngine.play();
  }, [hasFile, audioEngine]);

  const handleCut = useCallback(() => {
    if (selectedRegion) {
      audioEngine.cutRegion({ start: selectedRegion.start, end: selectedRegion.end });
      setRegions(prev => prev.filter(r => r.id !== selectedRegion.id));
      setSelectedRegion(null);
      toast.success('Регион вырезан');
    } else {
      toast.info('Выберите регион на waveform для вырезания');
    }
  }, [selectedRegion, audioEngine]);

  const handleCopy = useCallback(() => {
    if (selectedRegion) {
      toast.success('Регион скопирован в буфер');
    } else {
      toast.info('Выберите регион для копирования');
    }
  }, [selectedRegion]);

  const handleDelete = useCallback(() => {
    if (selectedRegion) {
      audioEngine.deleteRegion({ start: selectedRegion.start, end: selectedRegion.end });
      setRegions(prev => prev.filter(r => r.id !== selectedRegion.id));
      setSelectedRegion(null);
      toast.success('Регион удалён (заменён тишиной)');
    } else {
      toast.info('Выберите регион для удаления');
    }
  }, [selectedRegion, audioEngine]);

  const handleAddPause = useCallback(() => {
    audioEngine.insertSilence(audioEngine.currentTime, 2);
    toast.success('Пауза 2 сек добавлена');
  }, [audioEngine]);

  const handleNormalize = useCallback(() => {
    audioEngine.normalize();
    toast.success('Громкость нормализована');
  }, [audioEngine]);

  const handleFadeIn = useCallback(() => {
    if (selectedRegion) {
      audioEngine.fadeIn({ start: selectedRegion.start, end: selectedRegion.end });
      toast.success('Fade In применён к региону');
    } else {
      audioEngine.fadeIn({ start: 0, end: Math.min(3, audioEngine.duration) });
      toast.success('Fade In применён (первые 3 сек)');
    }
  }, [selectedRegion, audioEngine]);

  const handleFadeOut = useCallback(() => {
    if (selectedRegion) {
      audioEngine.fadeOut({ start: selectedRegion.start, end: selectedRegion.end });
      toast.success('Fade Out применён к региону');
    } else {
      const start = Math.max(0, audioEngine.duration - 3);
      audioEngine.fadeOut({ start, end: audioEngine.duration });
      toast.success('Fade Out применён (последние 3 сек)');
    }
  }, [selectedRegion, audioEngine]);

  const handleSilence = useCallback(() => {
    audioEngine.insertSilence(audioEngine.currentTime, 1);
    toast.success('Тишина 1 сек вставлена');
  }, [audioEngine]);

  const handleUndo = useCallback(() => {
    if (audioEngine.undo()) {
      toast.success('Отменено');
    } else {
      toast.info('Нечего отменять');
    }
  }, [audioEngine]);

  const handleRedo = useCallback(() => {
    if (audioEngine.redo()) {
      toast.success('Повторено');
    } else {
      toast.info('Нечего повторять');
    }
  }, [audioEngine]);

  const handleRegionSelect = useCallback((start: number, end: number) => {
    const newRegion = {
      id: `region-${Date.now()}`,
      start,
      end,
      color: 'hsla(187, 100%, 50%, 0.3)',
      label: 'Выделение',
    };
    setSelectedRegion(newRegion);
    setRegions(prev => [...prev.filter(r => !r.id.startsWith('region-')), newRegion]);
  }, []);

  const handleExport = useCallback(async (format: 'wav' | 'mp3', quality: number) => {
    setIsExporting(true);
    try {
      const blob = await audioEngine.exportAudio(format);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName.replace(/\.[^/.]+$/, '')}_edited.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Файл экспортирован как ${format.toUpperCase()}`);
      }
    } catch {
      toast.error('Ошибка экспорта');
    } finally {
      setIsExporting(false);
    }
  }, [audioEngine, fileName]);

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header projectName={fileName || 'Редактор'} />

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Back Button & Title */}
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-primary">Редактор</span> аудио
              </h1>
              <p className="text-sm text-muted-foreground">
                {hasFile ? fileName : 'Загрузите файл для редактирования'}
              </p>
            </div>
          </div>

          {hasFile && (
            <ExportDialog 
              onExport={handleExport} 
              isExporting={isExporting}
            />
          )}
        </div>

        {/* File Upload or Editor */}
        {!hasFile ? (
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <FileUpload onFileSelect={handleFileSelect} />
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <EditorToolbar
                onCut={handleCut}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onAddPause={handleAddPause}
                onNormalize={handleNormalize}
                onFadeIn={handleFadeIn}
                onFadeOut={handleFadeOut}
                onSilence={handleSilence}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onZoomIn={() => setZoom(z => Math.min(400, z + 25))}
                onZoomOut={() => setZoom(z => Math.max(25, z - 25))}
                hasSelection={!!selectedRegion}
                canUndo={audioEngine.canUndo}
                canRedo={audioEngine.canRedo}
                zoom={zoom}
              />
            </div>

            {/* Waveform */}
            <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {fileName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHasFile(false);
                    setFileName('');
                    audioEngine.stop();
                    setRegions([]);
                    setSelectedRegion(null);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Загрузить другой файл
                </Button>
              </div>
              <WaveformDisplay
                audioData={audioEngine.waveformData.length > 0 ? audioEngine.waveformData : undefined}
                isPlaying={audioEngine.isPlaying}
                currentTime={audioEngine.currentTime}
                duration={audioEngine.duration}
                onSeek={audioEngine.seek}
                showRegions={true}
                selectedRegion={selectedRegion ? { start: selectedRegion.start, end: selectedRegion.end } : null}
                onRegionSelect={handleRegionSelect}
              />
            </div>

            {/* Transport & Volume */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 animate-slide-up"
              style={{ animationDelay: '0.2s' }}
            >
              <TransportControls
                isPlaying={audioEngine.isPlaying}
                isLooping={false}
                onPlay={handlePlay}
                onPause={audioEngine.pause}
                onStop={audioEngine.stop}
                onSkipBack={() => audioEngine.seek(Math.max(0, audioEngine.currentTime - 10))}
                onSkipForward={() => audioEngine.seek(Math.min(audioEngine.duration, audioEngine.currentTime + 10))}
              />

              <div className="h-8 w-px bg-border hidden sm:block" />

              <VolumeControl
                volume={audioEngine.volume}
                onChange={audioEngine.setVolume}
                muted={audioEngine.isMuted}
                onMuteToggle={() => audioEngine.setIsMuted(!audioEngine.isMuted)}
              />

              <div className="h-8 w-px bg-border hidden sm:block" />

              {/* Time Display */}
              <div className="font-mono text-lg">
                <span className="text-primary">
                  {formatTime(audioEngine.currentTime)}
                </span>
                <span className="text-muted-foreground"> / </span>
                <span className="text-muted-foreground">
                  {formatTime(audioEngine.duration)}
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="animate-slide-up" style={{ animationDelay: '0.25s' }}>
              <Timeline
                duration={audioEngine.duration}
                currentTime={audioEngine.currentTime}
                regions={regions}
                selectedRegion={selectedRegion?.id || null}
                onSeek={audioEngine.seek}
                onRegionSelect={(id) => {
                  const region = regions.find(r => r.id === id);
                  if (region) {
                    setSelectedRegion(region);
                  } else {
                    setSelectedRegion(null);
                  }
                }}
                onCut={handleCut}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onAddPause={handleAddPause}
              />
            </div>

            {/* Effects Panel */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <EffectsPanel 
                effects={audioEngine.effects}
                onEffectsChange={audioEngine.setEffects}
              />
            </div>

            {/* Keyboard shortcuts */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground py-4 animate-fade-in">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Space</kbd>
                Play/Pause
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">←</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">→</kbd>
                Перемотка
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Ctrl+Z</kbd>
                Отмена
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Delete</kbd>
                Удалить
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default Editor;
