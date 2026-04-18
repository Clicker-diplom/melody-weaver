import { forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Settings, HelpCircle, Save, LogOut, Moon, Sun, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HeaderProps {
  onSave?: () => void;
  className?: string;
}

const Header = forwardRef<HTMLElement, HeaderProps>(({
  onSave,
  className,
}, ref) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleSave = () => {
    if (onSave) {
      onSave();
    } else {
      toast.info('Нечего сохранять');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <>
      <header
        ref={ref}
        className={cn(
          'h-14 px-4 flex items-center justify-between',
          'bg-card/80 backdrop-blur-lg border-b border-border/50',
          className
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-cyan">
            <Music className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SoundStorm
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleSave} className="hidden sm:flex">
            <Save className="h-4 w-4 mr-2" />
            Сохранить
          </Button>
          
          <div className="h-6 w-px bg-border mx-1" />

          <Button variant="ghost" size="icon-sm" onClick={() => setShowHelp(true)} title="Помощь">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setShowSettings(true)} title="Настройки">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={handleSignOut} title="Выйти">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Справка — SoundStorm</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p><strong className="text-foreground">Редактор</strong> — загрузите аудиофайл, обрезайте, применяйте эффекты и экспортируйте результат.</p>
            <p><strong className="text-foreground">Создание с нуля</strong> — пишите мелодии в Piano Roll, добавляйте аудио-треки, микшируйте и экспортируйте.</p>
            <div className="pt-2 border-t border-border">
              <p className="font-medium text-foreground mb-1">Горячие клавиши:</p>
              <ul className="space-y-1">
                <li><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Space</kbd> — Play / Pause</li>
                <li><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Ctrl+Z</kbd> — Отмена</li>
                <li><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Ctrl+Shift+Z</kbd> — Повтор</li>
                <li><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Delete</kbd> — Удалить выделение</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Настройки</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.darkTheme ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <Label htmlFor="theme-toggle" className="text-sm font-medium">
                  Темная тема
                </Label>
              </div>
              <Switch
                id="theme-toggle"
                checked={settings.darkTheme}
                onCheckedChange={(v) => updateSetting('darkTheme', v)}
              />
            </div>

            {/* Auto Save */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                <Label htmlFor="autosave-toggle" className="text-sm font-medium">
                  Автосохранение
                </Label>
              </div>
              <Switch
                id="autosave-toggle"
                checked={settings.autoSave}
                onCheckedChange={(v) => {
                  updateSetting('autoSave', v);
                  toast.success(v ? 'Автосохранение включено' : 'Автосохранение выключено');
                }}
              />
            </div>

            {/* Master Volume */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <Label className="text-sm font-medium">Общая громкость: {settings.masterVolume}%</Label>
              </div>
              <Slider
                value={[settings.masterVolume]}
                onValueChange={(value) => updateSetting('masterVolume', value[0])}
                max={100}
                step={5}
              />
            </div>

            {/* Buffer Size */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Размер буфера аудио</Label>
              <Select value={settings.bufferSize} onValueChange={(v) => {
                updateSetting('bufferSize', v);
                toast.info('Размер буфера изменён. Применится при следующей загрузке аудио.');
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="256">256 (минимальная задержка)</SelectItem>
                  <SelectItem value="512">512</SelectItem>
                  <SelectItem value="1024">1024</SelectItem>
                  <SelectItem value="2048">2048 (стандарт)</SelectItem>
                  <SelectItem value="4096">4096</SelectItem>
                  <SelectItem value="8192">8192 (максимальная стабильность)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Версия:</strong> 1.0.0</p>
              <p><strong className="text-foreground">Движок:</strong> Web Audio API</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

Header.displayName = 'Header';

export default Header;
