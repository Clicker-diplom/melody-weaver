import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import WaveformDisplay from '@/components/audio/WaveformDisplay';
import TransportControls from '@/components/audio/TransportControls';
import VolumeControl from '@/components/audio/VolumeControl';
import EffectsPanel from '@/components/audio/EffectsPanel';
import Timeline from '@/components/audio/Timeline';
import FileUpload from '@/components/audio/FileUpload';
import { cn } from '@/lib/utils';

const Editor = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const [regions, setRegions] = useState([
    { id: '1', start: 10, end: 35, color: 'hsl(187, 100%, 50%)', label: 'Секция 1' },
    { id: '2', start: 35, end: 80, color: 'hsl(328, 100%, 50%)', label: 'Секция 2' },
    { id: '3', start: 80, end: 110, color: 'hsl(25, 100%, 60%)', label: 'Секция 3' },
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && hasFile) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) {
            if (isLooping) return 0;
            setIsPlaying(false);
            return duration;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration, isLooping, hasFile]);

  const handlePlay = useCallback(() => {
    if (!hasFile) {
      toast.error('Сначала загрузите аудиофайл');
      return;
    }
    setIsPlaying(true);
    toast.success('Воспроизведение');
  }, [hasFile]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)));
  }, [duration]);

  const handleFileSelect = useCallback((file: File) => {
    setHasFile(true);
    setFileName(file.name);
    setCurrentTime(0);
    // Simulate duration based on file size (just for demo)
    setDuration(Math.max(60, Math.min(300, file.size / 10000)));
    toast.success(`Загружен: ${file.name}`);
  }, []);

  const handleCut = useCallback(() => {
    if (selectedRegion) {
      setRegions(prev => prev.filter(r => r.id !== selectedRegion));
      setSelectedRegion(null);
      toast.success('Регион вырезан');
    }
  }, [selectedRegion]);

  const handleCopy = useCallback(() => {
    if (selectedRegion) {
      toast.success('Регион скопирован в буфер');
    }
  }, [selectedRegion]);

  const handleDelete = useCallback(() => {
    if (selectedRegion) {
      setRegions(prev => prev.filter(r => r.id !== selectedRegion));
      setSelectedRegion(null);
      toast.success('Регион удалён');
    }
  }, [selectedRegion]);

  const handleAddPause = useCallback(() => {
    const newRegion = {
      id: `pause-${Date.now()}`,
      start: currentTime,
      end: currentTime + 2,
      color: 'hsl(240, 10%, 40%)',
      label: 'Пауза',
    };
    setRegions(prev => [...prev, newRegion]);
    toast.success('Пауза добавлена');
  }, [currentTime]);

  const handleExport = useCallback(() => {
    toast.success('Экспорт начат... (демо)');
  }, []);

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header projectName={fileName || 'Редактор'} />

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
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
                Загрузите файл для редактирования
              </p>
            </div>
          </div>

          {hasFile && (
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Экспорт
            </Button>
          )}
        </div>

        {/* File Upload or Waveform */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!hasFile ? (
            <FileUpload onFileSelect={handleFileSelect} />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {fileName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setHasFile(false);
                    setFileName('');
                    setCurrentTime(0);
                    setRegions([]);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Загрузить другой файл
                </Button>
              </div>
              <WaveformDisplay
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onSeek={handleSeek}
                showRegions={true}
              />
            </div>
          )}
        </div>

        {/* Transport & Volume */}
        {hasFile && (
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 animate-slide-up"
            style={{ animationDelay: '0.2s' }}
          >
            <TransportControls
              isPlaying={isPlaying}
              isRecording={isRecording}
              isLooping={isLooping}
              onPlay={handlePlay}
              onPause={handlePause}
              onStop={handleStop}
              onSkipBack={() => handleSeek(Math.max(0, currentTime - 10))}
              onSkipForward={() => handleSeek(Math.min(duration, currentTime + 10))}
              onRecord={() => setIsRecording(!isRecording)}
              onToggleLoop={() => setIsLooping(!isLooping)}
            />

            <div className="h-8 w-px bg-border hidden sm:block" />

            <VolumeControl
              volume={volume}
              onChange={setVolume}
              muted={isMuted}
              onMuteToggle={() => setIsMuted(!isMuted)}
            />
          </div>
        )}

        {/* Timeline */}
        {hasFile && (
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <Timeline
              duration={duration}
              currentTime={currentTime}
              regions={regions}
              selectedRegion={selectedRegion}
              onSeek={handleSeek}
              onRegionSelect={setSelectedRegion}
              onCut={handleCut}
              onCopy={handleCopy}
              onDelete={handleDelete}
              onAddPause={handleAddPause}
            />
          </div>
        )}

        {/* Effects Panel */}
        {hasFile && (
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <EffectsPanel />
          </div>
        )}

        {/* Keyboard shortcuts */}
        {hasFile && (
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
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">L</kbd>
              Loop
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Delete</kbd>
              Удалить
            </span>
          </div>
        )}
      </main>
    </div>
  );
};

export default Editor;
