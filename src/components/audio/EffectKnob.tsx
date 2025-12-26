import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface EffectKnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  unit?: string;
  color?: 'cyan' | 'magenta' | 'orange' | 'green';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const EffectKnob = ({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
  unit = '%',
  color = 'cyan',
  size = 'md',
  className,
}: EffectKnobProps) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const colorClasses = {
    cyan: 'from-glow-cyan to-glow-cyan/50 shadow-[0_0_20px_hsl(var(--glow-cyan)/0.3)]',
    magenta: 'from-glow-magenta to-glow-magenta/50 shadow-[0_0_20px_hsl(var(--glow-magenta)/0.3)]',
    orange: 'from-glow-orange to-glow-orange/50 shadow-[0_0_20px_hsl(var(--glow-orange)/0.3)]',
    green: 'from-glow-green to-glow-green/50 shadow-[0_0_20px_hsl(var(--glow-green)/0.3)]',
  };

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const percentage = ((value - min) / (max - min)) * 100;
  const rotation = (percentage / 100) * 270 - 135;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = startY.current - e.clientY;
      const range = max - min;
      const sensitivity = range / 150;
      const newValue = Math.max(min, Math.min(max, startValue.current + deltaY * sensitivity));
      onChange(Math.round(newValue * 10) / 10);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [value, min, max, onChange]);

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Knob */}
      <div
        ref={knobRef}
        className={cn(
          'relative rounded-full cursor-grab active:cursor-grabbing',
          'bg-gradient-to-b from-muted/50 to-muted/80',
          'border border-border/50',
          sizeClasses[size],
          isDragging && 'scale-105'
        )}
        onMouseDown={handleMouseDown}
        style={{ transition: isDragging ? 'none' : 'transform 0.15s ease' }}
      >
        {/* Track background */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 100 100"
        >
          {/* Background arc */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="198"
            strokeDashoffset="66"
          />
          {/* Value arc */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            className={cn('transition-all duration-75', {
              'stroke-glow-cyan': color === 'cyan',
              'stroke-glow-magenta': color === 'magenta',
              'stroke-glow-orange': color === 'orange',
              'stroke-glow-green': color === 'green',
            })}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="198"
            strokeDashoffset={198 - (percentage / 100) * 132}
            style={{
              filter: `drop-shadow(0 0 6px hsl(var(--glow-${color}) / 0.6))`,
            }}
          />
        </svg>

        {/* Center indicator */}
        <div
          className="absolute inset-2 rounded-full bg-card flex items-center justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div
            className={cn(
              'w-1 h-3 rounded-full bg-gradient-to-b -mt-3',
              colorClasses[color]
            )}
          />
        </div>
      </div>

      {/* Label */}
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </span>

      {/* Value */}
      <span className={cn(
        'text-sm font-mono font-semibold',
        {
          'text-glow-cyan': color === 'cyan',
          'text-glow-magenta': color === 'magenta',
          'text-glow-orange': color === 'orange',
          'text-glow-green': color === 'green',
        }
      )}>
        {value.toFixed(0)}{unit}
      </span>
    </div>
  );
};

export default EffectKnob;
