import { useState } from 'react';
import { Power, Waves, Timer, Radio, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import EffectKnob from './EffectKnob';
import { cn } from '@/lib/utils';

interface Effect {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  params: Record<string, number>;
  color: 'cyan' | 'magenta' | 'orange' | 'green';
}

interface EffectsPanelProps {
  className?: string;
}

const EffectsPanel = ({ className }: EffectsPanelProps) => {
  const [effects, setEffects] = useState<Effect[]>([
    {
      id: 'delay',
      name: 'Delay',
      icon: <Timer className="h-4 w-4" />,
      enabled: true,
      params: { time: 350, feedback: 40, mix: 30 },
      color: 'cyan',
    },
    {
      id: 'reverb',
      name: 'Reverb',
      icon: <Waves className="h-4 w-4" />,
      enabled: true,
      params: { size: 60, decay: 45, mix: 35 },
      color: 'magenta',
    },
    {
      id: 'filter',
      name: 'Filter',
      icon: <SlidersHorizontal className="h-4 w-4" />,
      enabled: false,
      params: { cutoff: 8000, resonance: 20, type: 0 },
      color: 'orange',
    },
    {
      id: 'distortion',
      name: 'Distortion',
      icon: <Radio className="h-4 w-4" />,
      enabled: false,
      params: { drive: 30, tone: 50, mix: 50 },
      color: 'green',
    },
  ]);

  const [selectedEffect, setSelectedEffect] = useState<string>('delay');

  const toggleEffect = (id: string) => {
    setEffects(prev =>
      prev.map(effect =>
        effect.id === id ? { ...effect, enabled: !effect.enabled } : effect
      )
    );
  };

  const updateParam = (effectId: string, param: string, value: number) => {
    setEffects(prev =>
      prev.map(effect =>
        effect.id === effectId
          ? { ...effect, params: { ...effect.params, [param]: value } }
          : effect
      )
    );
  };

  const currentEffect = effects.find(e => e.id === selectedEffect);

  return (
    <div className={cn('glass rounded-2xl p-4', className)}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-primary" />
        Эффекты
      </h3>

      {/* Effect tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {effects.map(effect => (
          <button
            key={effect.id}
            onClick={() => setSelectedEffect(effect.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
              'border whitespace-nowrap',
              selectedEffect === effect.id
                ? 'bg-primary/20 border-primary text-primary'
                : 'bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {effect.icon}
            <span className="text-sm font-medium">{effect.name}</span>
            <div
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
                effect.enabled ? 'bg-glow-green' : 'bg-muted-foreground/30'
              )}
            />
          </button>
        ))}
      </div>

      {/* Effect controls */}
      {currentEffect && (
        <div className="animate-fade-in">
          {/* Enable toggle */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">Активен</span>
            <Button
              variant={currentEffect.enabled ? 'transport-active' : 'transport'}
              size="icon-sm"
              onClick={() => toggleEffect(currentEffect.id)}
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>

          {/* Knobs */}
          <div className="flex justify-around flex-wrap gap-6">
            {currentEffect.id === 'delay' && (
              <>
                <EffectKnob
                  label="Time"
                  value={currentEffect.params.time}
                  min={10}
                  max={1000}
                  unit="ms"
                  color={currentEffect.color}
                  onChange={(v) => updateParam('delay', 'time', v)}
                />
                <EffectKnob
                  label="Feedback"
                  value={currentEffect.params.feedback}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('delay', 'feedback', v)}
                />
                <EffectKnob
                  label="Mix"
                  value={currentEffect.params.mix}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('delay', 'mix', v)}
                />
              </>
            )}

            {currentEffect.id === 'reverb' && (
              <>
                <EffectKnob
                  label="Size"
                  value={currentEffect.params.size}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('reverb', 'size', v)}
                />
                <EffectKnob
                  label="Decay"
                  value={currentEffect.params.decay}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('reverb', 'decay', v)}
                />
                <EffectKnob
                  label="Mix"
                  value={currentEffect.params.mix}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('reverb', 'mix', v)}
                />
              </>
            )}

            {currentEffect.id === 'filter' && (
              <>
                <EffectKnob
                  label="Cutoff"
                  value={currentEffect.params.cutoff}
                  min={20}
                  max={20000}
                  unit="Hz"
                  color={currentEffect.color}
                  onChange={(v) => updateParam('filter', 'cutoff', v)}
                />
                <EffectKnob
                  label="Resonance"
                  value={currentEffect.params.resonance}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('filter', 'resonance', v)}
                />
              </>
            )}

            {currentEffect.id === 'distortion' && (
              <>
                <EffectKnob
                  label="Drive"
                  value={currentEffect.params.drive}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('distortion', 'drive', v)}
                />
                <EffectKnob
                  label="Tone"
                  value={currentEffect.params.tone}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('distortion', 'tone', v)}
                />
                <EffectKnob
                  label="Mix"
                  value={currentEffect.params.mix}
                  color={currentEffect.color}
                  onChange={(v) => updateParam('distortion', 'mix', v)}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EffectsPanel;
