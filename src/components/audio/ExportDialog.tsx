import { useState, useEffect } from 'react';
import { Download, FileAudio, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';

interface ExportDialogProps {
  onExport: (format: 'wav' | 'mp3', quality: number) => void;
  isExporting?: boolean;
  trigger?: React.ReactNode;
}

const ExportDialog = ({ onExport, isExporting = false, trigger }: ExportDialogProps) => {
  const { settings } = useSettings();
  const [format, setFormat] = useState<'wav' | 'mp3'>(settings.defaultFormat);
  const [quality, setQuality] = useState(192);
  const [open, setOpen] = useState(false);

  // Sync default format from settings
  useEffect(() => {
    setFormat(settings.defaultFormat);
  }, [settings.defaultFormat]);

  const handleExport = () => {
    onExport(format, quality);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Экспорт
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileAudio className="h-5 w-5 text-primary" />
            Экспорт аудио
          </DialogTitle>
          <DialogDescription>
            Выберите формат и настройки качества
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Формат</Label>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat('wav')}
                className={cn(
                  'flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                  'flex flex-col items-center gap-2',
                  format === 'wav'
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-muted/30 hover:border-border/80'
                )}
              >
                <span className="text-2xl">🎵</span>
                <span className="font-semibold">WAV</span>
                <span className="text-xs text-muted-foreground">Без сжатия</span>
              </button>
              <button
                onClick={() => setFormat('mp3')}
                className={cn(
                  'flex-1 p-4 rounded-xl border-2 transition-all duration-200',
                  'flex flex-col items-center gap-2',
                  format === 'mp3'
                    ? 'border-secondary bg-secondary/10'
                    : 'border-border bg-muted/30 hover:border-border/80'
                )}
              >
                <span className="text-2xl">🎶</span>
                <span className="font-semibold">MP3</span>
                <span className="text-xs text-muted-foreground">Сжатый</span>
              </button>
            </div>
          </div>

          {/* Quality Settings for MP3 */}
          {format === 'mp3' && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <Label>Битрейт</Label>
                <span className="text-sm font-mono text-primary">{quality} kbps</span>
              </div>
              <Slider
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                min={128}
                max={320}
                step={32}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>128 kbps</span>
                <span>320 kbps</span>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-start gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                {format === 'wav' ? (
                  <>WAV - формат без потерь качества. Большой размер файла, идеально для дальнейшей обработки.</>
                ) : (
                  <>MP3 - сжатый формат. Меньший размер файла, подходит для публикации.</>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Экспорт...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Экспортировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
