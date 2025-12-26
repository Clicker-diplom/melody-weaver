import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import WaveformDisplay from '@/components/audio/WaveformDisplay';
import TransportControls from '@/components/audio/TransportControls';
import VolumeControl from '@/components/audio/VolumeControl';
import EffectsPanel from '@/components/audio/EffectsPanel';
import Timeline from '@/components/audio/Timeline';
import FileUpload from '@/components/audio/FileUpload';
import { cn } from '@/lib/utils';

const Index = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(180); // 3 minutes demo
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  // Start with demo file loaded for showcase
  const [hasFile, setHasFile] = useState(true);
  // hasFile is now defined above
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  // Demo timeline regions
  const [regions] = useState([
    { id: '1', start: 10, end: 35, color: 'hsl(187, 100%, 50%)', label: 'Вступление' },
    { id: '2', start: 35, end: 80, color: 'hsl(328, 100%, 50%)', label: 'Куплет 1' },
    { id: '3', start: 80, end: 110, color: 'hsl(25, 100%, 60%)', label: 'Припев' },
    { id: '4', start: 110, end: 155, color: 'hsl(328, 100%, 50%)', label: 'Куплет 2' },
    { id: '5', start: 155, end: 180, color: 'hsl(142, 70%, 50%)', label: 'Финал' },
  ]);

  // Simulate playback
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
    toast.info('Пауза');
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
    setCurrentTime(0);
    toast.success(`Загружен: ${file.name}`);
  }, []);

  const handleCut = useCallback(() => {
    if (selectedRegion) {
      toast.success('Регион вырезан');
    }
  }, [selectedRegion]);

  const handleCopy = useCallback(() => {
    if (selectedRegion) {
      toast.success('Регион скопирован');
    }
  }, [selectedRegion]);

  const handleDelete = useCallback(() => {
    if (selectedRegion) {
      toast.success('Регион удалён');
      setSelectedRegion(null);
    }
  }, [selectedRegion]);

  const handleAddPause = useCallback(() => {
    toast.success('Пауза добавлена на текущей позиции');
  }, []);

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header />

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Title Section */}
        <div className="text-center py-6 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              SoundForge
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Профессиональная обработка аудио с эффектами, редактированием и визуализацией
          </p>
        </div>

        {/* File Upload or Waveform */}
        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
          {!hasFile ? (
            <FileUpload onFileSelect={handleFileSelect} />
          ) : (
            <WaveformDisplay
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              showRegions={true}
            />
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

        {/* Keyboard shortcuts hint */}
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
              Удалить регион
            </span>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
