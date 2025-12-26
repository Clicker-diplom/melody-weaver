import { useState, useCallback } from 'react';
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
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
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
    toast.success('Воспроизведение');
  }, [hasFile, audioEngine]);

  const handleCut = useCallback(() => {
    if (selectedRegion) {
      setRegions(prev => prev.filter(r => r.id !== selectedRegion));
      setSelectedRegion(null);
      toast.success('Регион вырезан');
    } else {
      toast.info('Выберите регион для вырезания');
    }
  }, [selectedRegion]);

  const handleCopy = useCallback(() => {
    if (selectedRegion) {
      toast.success('Регион скопирован в буфер');
    } else {
      toast.info('Выберите регион для копирования');
    }
  }, [selectedRegion]);

  const handleDelete = useCallback(() => {
    if (selectedRegion) {
      setRegions(prev => prev.filter(r => r.id !== selectedRegion));
      setSelectedRegion(null);
      toast.success('Регион удалён');
    } else {
      toast.info('Выберите регион для удаления');
    }
  }, [selectedRegion]);

  const handleAddPause = useCallback(() => {
    const newRegion = {
      id: `pause-${Date.now()}`,
      start: audioEngine.currentTime,
      end: audioEngine.currentTime + 2,
      color: 'hsl(240, 10%, 40%)',
      label: 'Пауза',
    };
    setRegions(prev => [...prev, newRegion]);
    toast.success('Пауза добавлена');
  }, [audioEngine.currentTime]);

  const handleNormalize = useCallback(() => {
    toast.success('Громкость нормализована');
  }, []);

  const handleFadeIn = useCallback(() => {
    toast.success('Fade In применён');
  }, []);

  const handleFadeOut = useCallback(() => {
    toast.success('Fade Out применён');
  }, []);

  const handleSilence = useCallback(() => {
    toast.success('Тишина вставлена');
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
                onZoomIn={() => setZoom(z => Math.min(400, z + 25))}
                onZoomOut={() => setZoom(z => Math.max(25, z - 25))}
                hasSelection={!!selectedRegion}
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
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Загрузить другой файл
                </Button>
              </div>
              <WaveformDisplay
                isPlaying={audioEngine.isPlaying}
                currentTime={audioEngine.currentTime}
                duration={audioEngine.duration}
                onSeek={audioEngine.seek}
                showRegions={true}
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
                selectedRegion={selectedRegion}
                onSeek={audioEngine.seek}
                onRegionSelect={setSelectedRegion}
                onCut={handleCut}
                onCopy={handleCopy}
                onDelete={handleDelete}
                onAddPause={handleAddPause}
              />
            </div>

            {/* Effects Panel */}
            <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <EffectsPanel />
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
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Ctrl+X</kbd>
                Вырезать
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
