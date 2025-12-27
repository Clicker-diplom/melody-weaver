import React, { useState } from 'react';
import { Power, Waves, Timer, Radio, SlidersHorizontal, Volume2, Music2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EffectKnob from './EffectKnob';
import { cn } from '@/lib/utils';
import type { AudioEffects } from '@/hooks/useAudioEngine';

interface EffectsPanelProps {
  effects: AudioEffects;
  onEffectsChange: (effects: AudioEffects) => void;
  className?: string;
}

type EffectId = 'delay' | 'reverb' | 'filter' | 'distortion' | 'compressor' | 'eq' | 'chorus' | 'phaser';

interface EffectConfig {
  id: EffectId;
  name: string;
  icon: React.ReactNode;
  color: 'cyan' | 'magenta' | 'orange' | 'green';
}

const effectConfigs: EffectConfig[] = [
  {
    id: 'delay',
    name: 'Delay',
    icon: <Timer className="h-4 w-4" />,
    color: 'cyan',
  },
  {
    id: 'reverb',
    name: 'Reverb',
    icon: <Waves className="h-4 w-4" />,
    color: 'magenta',
  },
  {
    id: 'filter',
    name: 'Filter',
    icon: <SlidersHorizontal className="h-4 w-4" />,
    color: 'orange',
  },
  {
    id: 'distortion',
    name: 'Distortion',
    icon: <Radio className="h-4 w-4" />,
    color: 'green',
  },
  {
    id: 'compressor',
    name: 'Compressor',
    icon: <Volume2 className="h-4 w-4" />,
    color: 'cyan',
  },
  {
    id: 'eq',
    name: 'EQ',
    icon: <SlidersHorizontal className="h-4 w-4" />,
    color: 'magenta',
  },
  {
    id: 'chorus',
    name: 'Chorus',
    icon: <Music2 className="h-4 w-4" />,
    color: 'orange',
  },
  {
    id: 'phaser',
    name: 'Phaser',
    icon: <Zap className="h-4 w-4" />,
    color: 'green',
  },
];

const EffectsPanel = ({ effects, onEffectsChange, className }: EffectsPanelProps) => {
  const [selectedEffect, setSelectedEffect] = useState<EffectId>('delay');

  const toggleEffect = (id: EffectId) => {
    onEffectsChange({
      ...effects,
      [id]: { ...effects[id], enabled: !effects[id].enabled },
    });
  };

  const updateParam = (effectId: EffectId, param: string, value: number) => {
    onEffectsChange({
      ...effects,
      [effectId]: { ...effects[effectId], [param]: value },
    });
  };

  const currentConfig = effectConfigs.find(e => e.id === selectedEffect);
  const currentEffect = effects[selectedEffect];

  return (
    <div className={cn('glass rounded-2xl p-4', className)}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-primary" />
        Эффекты
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {effectConfigs.filter(e => effects[e.id].enabled).length} активно
        </span>
      </h3>

      {/* Effect tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {effectConfigs.map(config => (
          <button
            key={config.id}
            onClick={() => setSelectedEffect(config.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
              'border whitespace-nowrap',
              selectedEffect === config.id
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {config.icon}
            <span className="text-sm font-medium">{config.name}</span>
            <div
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                effects[config.id].enabled ? 'bg-glow-green animate-pulse' : 'bg-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>

      {/* Effect controls */}
      {currentConfig && (
        <div className="animate-fade-in">
          {/* Enable toggle */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">
              {currentEffect.enabled ? 'Эффект активен' : 'Эффект выключен'}
            </span>
            <Button
              variant={currentEffect.enabled ? 'transport-active' : 'transport'}
              size="icon-sm"
              onClick={() => toggleEffect(currentConfig.id)}
              className={cn(
                currentEffect.enabled && 'ring-2 ring-glow-green/50'
              )}
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>

          {/* Knobs */}
          <div className="flex justify-around flex-wrap gap-6">
            {currentConfig.id === 'delay' && (
              <>
                <EffectKnob
                  label="Time"
                  value={effects.delay.time}
                  min={10}
                  max={1000}
                  unit="ms"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('delay', 'time', v)}
                  disabled={!effects.delay.enabled}
                />
                <EffectKnob
                  label="Feedback"
                  value={effects.delay.feedback}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('delay', 'feedback', v)}
                  disabled={!effects.delay.enabled}
                />
                <EffectKnob
                  label="Mix"
                  value={effects.delay.mix}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('delay', 'mix', v)}
                  disabled={!effects.delay.enabled}
                />
              </>
            )}

            {currentConfig.id === 'reverb' && (
              <>
                <EffectKnob
                  label="Size"
                  value={effects.reverb.size}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('reverb', 'size', v)}
                  disabled={!effects.reverb.enabled}
                />
                <EffectKnob
                  label="Decay"
                  value={effects.reverb.decay}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('reverb', 'decay', v)}
                  disabled={!effects.reverb.enabled}
                />
                <EffectKnob
                  label="Mix"
                  value={effects.reverb.mix}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('reverb', 'mix', v)}
                  disabled={!effects.reverb.enabled}
                />
              </>
            )}

            {currentConfig.id === 'filter' && (
              <>
                <EffectKnob
                  label="Cutoff"
                  value={effects.filter.cutoff}
                  min={20}
                  max={20000}
                  unit="Hz"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('filter', 'cutoff', v)}
                  disabled={!effects.filter.enabled}
                />
                <EffectKnob
                  label="Resonance"
                  value={effects.filter.resonance}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('filter', 'resonance', v)}
                  disabled={!effects.filter.enabled}
                />
              </>
            )}

            {currentConfig.id === 'distortion' && (
              <>
                <EffectKnob
                  label="Drive"
                  value={effects.distortion.drive}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('distortion', 'drive', v)}
                  disabled={!effects.distortion.enabled}
                />
                <EffectKnob
                  label="Tone"
                  value={effects.distortion.tone}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('distortion', 'tone', v)}
                  disabled={!effects.distortion.enabled}
                />
                <EffectKnob
                  label="Mix"
                  value={effects.distortion.mix}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('distortion', 'mix', v)}
                  disabled={!effects.distortion.enabled}
                />
              </>
            )}

            {currentConfig.id === 'compressor' && (
              <>
                <EffectKnob
                  label="Threshold"
                  value={effects.compressor.threshold}
                  min={-60}
                  max={0}
                  unit="dB"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('compressor', 'threshold', v)}
                  disabled={!effects.compressor.enabled}
                />
                <EffectKnob
                  label="Ratio"
                  value={effects.compressor.ratio}
                  min={1}
                  max={20}
                  unit=":1"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('compressor', 'ratio', v)}
                  disabled={!effects.compressor.enabled}
                />
                <EffectKnob
                  label="Attack"
                  value={effects.compressor.attack}
                  min={0}
                  max={100}
                  unit="ms"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('compressor', 'attack', v)}
                  disabled={!effects.compressor.enabled}
                />
                <EffectKnob
                  label="Release"
                  value={effects.compressor.release}
                  min={10}
                  max={1000}
                  unit="ms"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('compressor', 'release', v)}
                  disabled={!effects.compressor.enabled}
                />
              </>
            )}

            {currentConfig.id === 'eq' && (
              <>
                <EffectKnob
                  label="Low"
                  value={effects.eq.low}
                  min={-12}
                  max={12}
                  unit="dB"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('eq', 'low', v)}
                  disabled={!effects.eq.enabled}
                />
                <EffectKnob
                  label="Mid"
                  value={effects.eq.mid}
                  min={-12}
                  max={12}
                  unit="dB"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('eq', 'mid', v)}
                  disabled={!effects.eq.enabled}
                />
                <EffectKnob
                  label="High"
                  value={effects.eq.high}
                  min={-12}
                  max={12}
                  unit="dB"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('eq', 'high', v)}
                  disabled={!effects.eq.enabled}
                />
              </>
            )}

            {currentConfig.id === 'chorus' && (
              <>
                <EffectKnob
                  label="Rate"
                  value={effects.chorus.rate}
                  min={0.1}
                  max={10}
                  unit="Hz"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('chorus', 'rate', v)}
                  disabled={!effects.chorus.enabled}
                />
                <EffectKnob
                  label="Depth"
                  value={effects.chorus.depth}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('chorus', 'depth', v)}
                  disabled={!effects.chorus.enabled}
                />
                <EffectKnob
                  label="Mix"
                  value={effects.chorus.mix}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('chorus', 'mix', v)}
                  disabled={!effects.chorus.enabled}
                />
              </>
            )}

            {currentConfig.id === 'phaser' && (
              <>
                <EffectKnob
                  label="Rate"
                  value={effects.phaser.rate}
                  min={0.1}
                  max={5}
                  unit="Hz"
                  color={currentConfig.color}
                  onChange={(v) => updateParam('phaser', 'rate', v)}
                  disabled={!effects.phaser.enabled}
                />
                <EffectKnob
                  label="Depth"
                  value={effects.phaser.depth}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('phaser', 'depth', v)}
                  disabled={!effects.phaser.enabled}
                />
                <EffectKnob
                  label="Feedback"
                  value={effects.phaser.feedback}
                  color={currentConfig.color}
                  onChange={(v) => updateParam('phaser', 'feedback', v)}
                  disabled={!effects.phaser.enabled}
                />
              </>
            )}
          </div>
          
          {/* Effect description */}
          <p className="text-xs text-muted-foreground mt-6 text-center">
            {currentConfig.id === 'delay' && 'Эхо-эффект с настраиваемым временем задержки и обратной связью'}
            {currentConfig.id === 'reverb' && 'Имитация акустического пространства с регулировкой размера и затухания'}
            {currentConfig.id === 'filter' && 'Низкочастотный фильтр для срезания высоких частот'}
            {currentConfig.id === 'distortion' && 'Эффект искажения для добавления гармоник и насыщенности'}
            {currentConfig.id === 'compressor' && 'Динамическая обработка для выравнивания громкости'}
            {currentConfig.id === 'eq' && 'Трёхполосный эквалайзер для коррекции тембра'}
            {currentConfig.id === 'chorus' && 'Эффект хоруса для добавления глубины и объёма'}
            {currentConfig.id === 'phaser' && 'Фазовый эффект для создания характерного "плавающего" звука'}
          </p>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
