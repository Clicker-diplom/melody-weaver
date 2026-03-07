import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Trash2, Power, Volume2, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface CustomEffect {
  id: string;
  name: string;
  buffer: AudioBuffer;
  enabled: boolean;
  mix: number; // 0–100
}

interface CustomAudioEffectsProps {
  audioContext: AudioContext | null;
  masterGain: GainNode | null;
  /** The source node to tap into for convolution. If null, effects won't process. */
  sourceNode: AudioNode | null;
  className?: string;
}

const CustomAudioEffects = ({
  audioContext,
  masterGain,
  sourceNode,
  className,
}: CustomAudioEffectsProps) => {
  const [customEffects, setCustomEffects] = useState<CustomEffect[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const convolverRefs = useRef<Map<string, ConvolverNode>>(new Map());
  const gainRefs = useRef<Map<string, GainNode>>(new Map());

  // Rebuild audio graph when effects/source change
  useEffect(() => {
    if (!audioContext || !masterGain || !sourceNode) return;

    // Disconnect old nodes
    convolverRefs.current.forEach((conv, id) => {
      try { conv.disconnect(); } catch {}
      const gain = gainRefs.current.get(id);
      if (gain) try { gain.disconnect(); } catch {}
    });
    convolverRefs.current.clear();
    gainRefs.current.clear();

    // Create new convolver chains for enabled effects
    customEffects.forEach(effect => {
      if (!effect.enabled) return;

      const convolver = audioContext.createConvolver();
      convolver.buffer = effect.buffer;

      const wetGain = audioContext.createGain();
      wetGain.gain.value = effect.mix / 100;

      try {
        sourceNode.connect(convolver);
        convolver.connect(wetGain);
        wetGain.connect(masterGain);
      } catch (e) {
        console.error('Error connecting custom effect:', e);
      }

      convolverRefs.current.set(effect.id, convolver);
      gainRefs.current.set(effect.id, wetGain);
    });

    return () => {
      convolverRefs.current.forEach((conv) => {
        try { conv.disconnect(); } catch {}
      });
      gainRefs.current.forEach((gain) => {
        try { gain.disconnect(); } catch {}
      });
    };
  }, [audioContext, masterGain, sourceNode, customEffects]);

  // Update gain values in real-time without rebuilding graph
  useEffect(() => {
    customEffects.forEach(effect => {
      const gain = gainRefs.current.get(effect.id);
      if (gain) {
        gain.gain.value = effect.enabled ? effect.mix / 100 : 0;
      }
    });
  }, [customEffects]);

  // Trim buffer to max duration to prevent memory crashes with ConvolverNode
  const trimBuffer = useCallback((ctx: AudioContext, buffer: AudioBuffer, maxSeconds: number): AudioBuffer => {
    const maxSamples = Math.min(buffer.length, Math.floor(maxSeconds * buffer.sampleRate));
    if (maxSamples >= buffer.length) return buffer;

    const trimmed = ctx.createBuffer(buffer.numberOfChannels, maxSamples, buffer.sampleRate);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = trimmed.getChannelData(ch);
      // Apply fade-out in last 0.05s to avoid clicks
      const fadeStart = Math.max(0, maxSamples - Math.floor(0.05 * buffer.sampleRate));
      for (let i = 0; i < maxSamples; i++) {
        if (i >= fadeStart) {
          const fade = 1 - (i - fadeStart) / (maxSamples - fadeStart);
          dst[i] = src[i] * fade;
        } else {
          dst[i] = src[i];
        }
      }
    }
    return trimmed;
  }, []);

  const MAX_IR_SECONDS = 10;

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioContext) return;

    // Validate
    const validExts = /\.(wav|mp3|ogg|flac|m4a)$/i;
    if (!validExts.test(file.name)) {
      toast.error('Неподдерживаемый формат. Используйте WAV, MP3, OGG, FLAC');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 50 МБ)');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const decoded = await audioContext.decodeAudioData(arrayBuffer);

      // Trim long files to prevent ConvolverNode memory crash
      const audioBuffer = trimBuffer(audioContext, decoded, MAX_IR_SECONDS);
      const wasTrimmed = decoded.length !== audioBuffer.length;

      const newEffect: CustomEffect = {
        id: `custom-fx-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        buffer: audioBuffer,
        enabled: true,
        mix: 40,
      };

      setCustomEffects(prev => [...prev, newEffect]);
      toast.success(
        wasTrimmed
          ? `Эффект "${newEffect.name}" добавлен (обрезан до ${MAX_IR_SECONDS}с для стабильности)`
          : `Эффект "${newEffect.name}" добавлен`
      );
    } catch (err) {
      console.error('Audio decode error:', err);
      toast.error('Ошибка декодирования аудиофайла');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [audioContext, trimBuffer]);

  const toggleEffect = useCallback((id: string) => {
    setCustomEffects(prev =>
      prev.map(fx => fx.id === id ? { ...fx, enabled: !fx.enabled } : fx)
    );
  }, []);

  const updateMix = useCallback((id: string, mix: number) => {
    setCustomEffects(prev =>
      prev.map(fx => fx.id === id ? { ...fx, mix } : fx)
    );
  }, []);

  const removeEffect = useCallback((id: string) => {
    // Disconnect nodes
    const conv = convolverRefs.current.get(id);
    const gain = gainRefs.current.get(id);
    if (conv) try { conv.disconnect(); } catch {}
    if (gain) try { gain.disconnect(); } catch {}
    convolverRefs.current.delete(id);
    gainRefs.current.delete(id);

    setCustomEffects(prev => prev.filter(fx => fx.id !== id));
    toast.success('Эффект удалён');
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('glass rounded-2xl p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Music className="h-5 w-5 text-secondary" />
          Свои эффекты
          {customEffects.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {customEffects.filter(fx => fx.enabled).length}/{customEffects.length} активно
            </span>
          )}
        </h3>
        <Button
          variant="glass"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="gap-1"
        >
          <Upload className="h-4 w-4" />
          Загрузить
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.ogg,.flac,.m4a"
        onChange={handleFileUpload}
        className="hidden"
      />

      {customEffects.length === 0 ? (
        <div
          className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-border transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Загрузите аудиофайл для использования как эффект
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Импульсные отклики (IR), звуковые текстуры, атмосферы
          </p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            WAV, MP3, OGG, FLAC — макс. 50 МБ
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {customEffects.map(effect => (
            <div
              key={effect.id}
              className={cn(
                'rounded-lg border p-3 transition-all duration-200',
                effect.enabled
                  ? 'border-secondary/50 bg-secondary/5'
                  : 'border-border/50 bg-muted/20 opacity-60'
              )}
            >
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant={effect.enabled ? 'transport-active' : 'transport'}
                  size="icon-sm"
                  onClick={() => toggleEffect(effect.id)}
                  className={cn(
                    'shrink-0',
                    effect.enabled && 'ring-2 ring-glow-green/50'
                  )}
                >
                  <Power className="h-3.5 w-3.5" />
                </Button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{effect.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(effect.buffer.duration)} • {effect.buffer.sampleRate} Hz • {effect.buffer.numberOfChannels}ch
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeEffect(effect.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Mix slider */}
              <div className="flex items-center gap-3">
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Slider
                  value={[effect.mix]}
                  min={0}
                  max={100}
                  step={1}
                  variant="magenta"
                  onValueChange={([v]) => updateMix(effect.id, v)}
                  disabled={!effect.enabled}
                  className="flex-1"
                />
                <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                  {effect.mix}%
                </span>
              </div>
            </div>
          ))}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-2 border border-dashed border-border/50 rounded-lg text-sm text-muted-foreground hover:border-secondary hover:text-secondary transition-colors flex items-center justify-center gap-1"
          >
            <Upload className="h-4 w-4" />
            Добавить ещё эффект
          </button>
        </div>
      )}

      <p className="text-xs text-muted-foreground/60 mt-3 text-center">
        Загруженные файлы используются как свёрточные эффекты (конволюция) для обработки звука в реальном времени
      </p>
    </div>
  );
};

export default CustomAudioEffects;
