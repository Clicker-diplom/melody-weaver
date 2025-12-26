import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import EffectsPanel from '@/components/audio/EffectsPanel';
import TransportControls from '@/components/audio/TransportControls';
import VolumeControl from '@/components/audio/VolumeControl';
import ExportDialog from '@/components/audio/ExportDialog';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  pitch: number;
  octave: number;
  start: number;
  duration: number;
}

interface Track {
  id: string;
  name: string;
  color: string;
  notes: Note[];
  volume: number;
  muted: boolean;
}

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const octaves = [5, 4, 3, 2];

const Creator = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [totalBeats] = useState(32);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string>('track-1');
  const [isExporting, setIsExporting] = useState(false);

  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 'track-1',
      name: 'Мелодия',
      color: 'hsl(187, 100%, 50%)',
      notes: [
        { id: 'n1', pitch: 0, octave: 4, start: 0, duration: 2 },
        { id: 'n2', pitch: 4, octave: 4, start: 2, duration: 2 },
        { id: 'n3', pitch: 7, octave: 4, start: 4, duration: 2 },
        { id: 'n4', pitch: 5, octave: 4, start: 6, duration: 2 },
      ],
      volume: 100,
      muted: false,
    },
    {
      id: 'track-2',
      name: 'Бас',
      color: 'hsl(328, 100%, 50%)',
      notes: [
        { id: 'b1', pitch: 0, octave: 2, start: 0, duration: 4 },
        { id: 'b2', pitch: 5, octave: 2, start: 4, duration: 4 },
      ],
      volume: 80,
      muted: false,
    },
  ]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeOscillatorsRef = useRef<Map<string, OscillatorNode>>(new Map());
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    audioContextRef.current = new AudioContext();
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);
    
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Playback loop with note triggering
  useEffect(() => {
    if (isPlaying) {
      const beatDuration = 60 / bpm;
      let lastBeat = -1;
      
      playIntervalRef.current = setInterval(() => {
        setCurrentBeat(prev => {
          const next = prev + 0.125;
          const currentBeatInt = Math.floor(next);
          
          // Trigger notes on beat change
          if (currentBeatInt !== lastBeat && audioContextRef.current && gainNodeRef.current) {
            lastBeat = currentBeatInt;
            
            tracks.forEach(track => {
              if (track.muted) return;
              
              track.notes.forEach(note => {
                if (note.start === currentBeatInt) {
                  const frequency = 440 * Math.pow(2, (note.pitch - 9 + (note.octave - 4) * 12) / 12);
                  const osc = audioContextRef.current!.createOscillator();
                  const noteGain = audioContextRef.current!.createGain();
                  
                  osc.type = 'sine';
                  osc.frequency.value = frequency;
                  
                  const noteDuration = (note.duration * beatDuration);
                  noteGain.gain.setValueAtTime(0.3 * (track.volume / 100), audioContextRef.current!.currentTime);
                  noteGain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current!.currentTime + noteDuration * 0.9);
                  
                  osc.connect(noteGain);
                  noteGain.connect(gainNodeRef.current!);
                  
                  osc.start();
                  osc.stop(audioContextRef.current!.currentTime + noteDuration);
                }
              });
            });
          }
          
          if (next >= totalBeats) {
            return 0;
          }
          return next;
        });
      }, (beatDuration * 1000) / 8);
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, bpm, totalBeats, tracks]);

  const playNote = useCallback((pitch: number, octave: number, duration: number = 0.3) => {
    if (!audioContextRef.current || !gainNodeRef.current) return;
    
    const frequency = 440 * Math.pow(2, (pitch - 9 + (octave - 4) * 12) / 12);
    const osc = audioContextRef.current.createOscillator();
    const noteGain = audioContextRef.current.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = frequency;
    
    noteGain.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);
    
    osc.connect(noteGain);
    noteGain.connect(gainNodeRef.current);
    
    osc.start();
    osc.stop(audioContextRef.current.currentTime + duration);
  }, []);

  const handlePlay = useCallback(() => {
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setIsPlaying(true);
    toast.success('Воспроизведение');
  }, []);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const addNote = useCallback((trackId: string, pitch: number, octave: number, beat: number) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      pitch,
      octave,
      start: beat,
      duration: 1,
    };
    
    setTracks(prev => prev.map(track => 
      track.id === trackId
        ? { ...track, notes: [...track.notes, newNote] }
        : track
    ));
    
    playNote(pitch, octave);
  }, [playNote]);

  const removeNote = useCallback((trackId: string, noteId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, notes: track.notes.filter(n => n.id !== noteId) }
        : track
    ));
  }, []);

  const addTrack = useCallback(() => {
    const colors = ['hsl(25, 100%, 60%)', 'hsl(142, 70%, 50%)', 'hsl(270, 70%, 60%)'];
    const newTrack: Track = {
      id: `track-${Date.now()}`,
      name: `Трек ${tracks.length + 1}`,
      color: colors[tracks.length % colors.length],
      notes: [],
      volume: 100,
      muted: false,
    };
    setTracks(prev => [...prev, newTrack]);
    setSelectedTrack(newTrack.id);
    toast.success('Трек добавлен');
  }, [tracks.length]);

  const deleteTrack = useCallback((trackId: string) => {
    if (tracks.length <= 1) {
      toast.error('Нельзя удалить последний трек');
      return;
    }
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (selectedTrack === trackId) {
      setSelectedTrack(tracks[0].id);
    }
    toast.success('Трек удалён');
  }, [tracks, selectedTrack]);

  const handleExport = useCallback(async (format: 'wav' | 'mp3', quality: number) => {
    setIsExporting(true);
    
    try {
      // Render all notes to an audio buffer
      const sampleRate = 44100;
      const beatDuration = 60 / bpm;
      const totalDuration = totalBeats * beatDuration;
      const bufferLength = Math.ceil(totalDuration * sampleRate);
      
      const offlineCtx = new OfflineAudioContext(2, bufferLength, sampleRate);
      const masterGain = offlineCtx.createGain();
      masterGain.gain.value = volume / 100;
      masterGain.connect(offlineCtx.destination);
      
      // Schedule all notes
      tracks.forEach(track => {
        if (track.muted) return;
        
        track.notes.forEach(note => {
          const frequency = 440 * Math.pow(2, (note.pitch - 9 + (note.octave - 4) * 12) / 12);
          const osc = offlineCtx.createOscillator();
          const noteGain = offlineCtx.createGain();
          
          osc.type = 'sine';
          osc.frequency.value = frequency;
          
          const startTime = note.start * beatDuration;
          const noteDuration = note.duration * beatDuration;
          
          noteGain.gain.setValueAtTime(0.3 * (track.volume / 100), startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration * 0.9);
          
          osc.connect(noteGain);
          noteGain.connect(masterGain);
          
          osc.start(startTime);
          osc.stop(startTime + noteDuration);
        });
      });
      
      const renderedBuffer = await offlineCtx.startRendering();
      
      // Convert to WAV
      const wavBlob = audioBufferToWav(renderedBuffer);
      
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `composition.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Композиция экспортирована как ${format.toUpperCase()}`);
    } catch {
      toast.error('Ошибка экспорта');
    } finally {
      setIsExporting(false);
    }
  }, [bpm, totalBeats, tracks, volume]);

  const currentTrack = tracks.find(t => t.id === selectedTrack);

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header projectName="Создание музыки" />

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
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
                <span className="text-secondary">Создание</span> музыки
              </h1>
              <p className="text-sm text-muted-foreground">
                Пианоролл • {bpm} BPM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">BPM:</span>
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(Math.max(40, Math.min(240, parseInt(e.target.value) || 120)))}
                className="w-16 px-2 py-1 text-sm rounded-md bg-muted border border-border text-center font-mono"
              />
            </div>
            <ExportDialog 
              onExport={handleExport} 
              isExporting={isExporting}
            />
          </div>
        </div>

        {/* Transport */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <TransportControls
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onSkipBack={() => setCurrentBeat(Math.max(0, currentBeat - 4))}
            onSkipForward={() => setCurrentBeat(Math.min(totalBeats, currentBeat + 4))}
          />

          <div className="h-8 w-px bg-border hidden sm:block" />

          <VolumeControl
            volume={volume}
            onChange={setVolume}
            muted={isMuted}
            onMuteToggle={() => setIsMuted(!isMuted)}
          />

          <div className="h-8 w-px bg-border hidden sm:block" />

          <div className="font-mono text-lg">
            <span className="text-primary">{Math.floor(currentBeat / 4) + 1}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-muted-foreground">{(Math.floor(currentBeat) % 4) + 1}</span>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex gap-2 overflow-x-auto pb-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {tracks.map(track => (
            <button
              key={track.id}
              onClick={() => setSelectedTrack(track.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
                'border whitespace-nowrap min-w-[120px]',
                selectedTrack === track.id
                  ? 'border-primary bg-primary/20'
                  : 'bg-muted/30 border-border/50 hover:border-border'
              )}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: track.color }}
              />
              <span className="text-sm font-medium">{track.name}</span>
              {tracks.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTrack(track.id);
                  }}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </button>
          ))}
          <Button variant="glass" size="sm" onClick={addTrack} className="gap-1">
            <Plus className="h-4 w-4" />
            Трек
          </Button>
        </div>

        {/* Piano Roll */}
        <div
          className="glass rounded-2xl p-4 overflow-x-auto animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="min-w-[800px]">
            {/* Beat numbers */}
            <div className="flex ml-16 mb-2">
              {Array.from({ length: totalBeats }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-8 text-center text-xs font-mono',
                    i % 4 === 0 ? 'text-foreground' : 'text-muted-foreground/50'
                  )}
                >
                  {i % 4 === 0 ? i / 4 + 1 : ''}
                </div>
              ))}
            </div>

            {/* Piano keys + grid */}
            <div className="relative">
              {octaves.map(octave => (
                noteNames.map((note, noteIndex) => {
                  const isBlackKey = note.includes('#');
                  const rowKey = `${noteIndex}-${octave}`;
                  
                  return (
                    <div key={rowKey} className="flex h-6">
                      {/* Piano key */}
                      <div
                        className={cn(
                          'w-16 flex items-center justify-end pr-2 text-xs font-mono border-r border-border',
                          isBlackKey ? 'bg-muted/80 text-muted-foreground' : 'bg-muted/40'
                        )}
                      >
                        {note}{octave}
                      </div>

                      {/* Grid cells */}
                      <div className="flex flex-1 relative">
                        {Array.from({ length: totalBeats }).map((_, beat) => {
                          const noteOnBeat = currentTrack?.notes.find(
                            n => n.pitch === noteIndex && n.octave === octave && 
                                beat >= n.start && beat < n.start + n.duration
                          );
                          const isNoteStart = noteOnBeat && beat === noteOnBeat.start;

                          return (
                            <div
                              key={beat}
                              onClick={() => {
                                if (noteOnBeat) {
                                  removeNote(selectedTrack, noteOnBeat.id);
                                } else {
                                  addNote(selectedTrack, noteIndex, octave, beat);
                                }
                              }}
                              className={cn(
                                'w-8 h-6 border-r border-b cursor-pointer transition-colors',
                                beat % 4 === 0 ? 'border-r-border' : 'border-r-border/30',
                                isBlackKey ? 'bg-muted/30' : 'bg-background/50',
                                'hover:bg-primary/20',
                                noteOnBeat && 'bg-transparent'
                              )}
                            >
                              {isNoteStart && noteOnBeat && (
                                <div
                                  className="h-full rounded-sm"
                                  style={{
                                    backgroundColor: currentTrack?.color,
                                    width: `${noteOnBeat.duration * 32}px`,
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}

                        {/* Playhead */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 pointer-events-none"
                          style={{
                            left: `${(currentBeat / totalBeats) * 100}%`,
                            boxShadow: '0 0 10px hsl(var(--primary))',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
          </div>
        </div>

        {/* Effects Panel */}
        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <EffectsPanel />
        </div>

        {/* Tips */}
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground py-4 animate-fade-in">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Click</kbd>
            Добавить/удалить ноту
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Space</kbd>
            Play/Pause
          </span>
        </div>
      </main>
    </div>
  );
};

// Helper function to convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export default Creator;
