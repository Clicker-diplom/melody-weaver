import { 
  Scissors, 
  Copy, 
  Trash2, 
  Pause, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut,
  Volume2,
  VolumeX,
  Waves,
  SlidersHorizontal,
  Music
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface EditorToolbarProps {
  onCut?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onAddPause?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onNormalize?: () => void;
  onFadeIn?: () => void;
  onFadeOut?: () => void;
  onSilence?: () => void;
  hasSelection?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  zoom?: number;
  className?: string;
}

const EditorToolbar = ({
  onCut,
  onCopy,
  onDelete,
  onAddPause,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onNormalize,
  onFadeIn,
  onFadeOut,
  onSilence,
  hasSelection = false,
  canUndo = false,
  canRedo = false,
  zoom = 100,
  className,
}: EditorToolbarProps) => {
  return (
    <div className={cn(
      'flex items-center gap-2 p-3 glass rounded-xl overflow-x-auto',
      className
    )}>
      {/* Edit Section */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground px-2 hidden sm:block">Редактирование</span>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onCut}
          disabled={!hasSelection}
          title="Вырезать (Ctrl+X)"
        >
          <Scissors className="h-4 w-4" />
        </Button>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onCopy}
          disabled={!hasSelection}
          title="Копировать (Ctrl+C)"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onDelete}
          disabled={!hasSelection}
          title="Удалить (Delete)"
          className="hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* History Section */}
      <div className="flex items-center gap-1">
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onUndo}
          disabled={!canUndo}
          title="Отменить (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onRedo}
          disabled={!canRedo}
          title="Повторить (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Insert Section */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground px-2 hidden sm:block">Вставка</span>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onAddPause}
          title="Добавить паузу"
        >
          <Pause className="h-4 w-4" />
        </Button>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onSilence}
          title="Вставить тишину"
        >
          <VolumeX className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Audio Processing Section */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground px-2 hidden sm:block">Обработка</span>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onNormalize}
          title="Нормализация громкости"
        >
          <Volume2 className="h-4 w-4" />
        </Button>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onFadeIn}
          title="Fade In"
          className="relative"
        >
          <Waves className="h-4 w-4" />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold text-primary">↗</span>
        </Button>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onFadeOut}
          title="Fade Out"
          className="relative"
        >
          <Waves className="h-4 w-4" />
          <span className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold text-primary">↘</span>
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Zoom Section */}
      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onZoomOut}
          disabled={zoom <= 25}
          title="Уменьшить масштаб"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-mono text-muted-foreground w-12 text-center">
          {zoom}%
        </span>
        <Button
          variant="glass"
          size="icon-sm"
          onClick={onZoomIn}
          disabled={zoom >= 400}
          title="Увеличить масштаб"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default EditorToolbar;
