import { forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Settings, HelpCircle, Save, FolderOpen, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface HeaderProps {
  onSave?: () => void;
  onOpen?: () => void;
  className?: string;
}

const Header = forwardRef<HTMLElement, HeaderProps>(({
  onSave,
  onOpen,
  className,
}, ref) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleOpen = () => {
    if (onOpen) {
      onOpen();
    } else {
      navigate('/');
    }
  };

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
          <Button variant="ghost" size="sm" onClick={handleOpen} className="hidden sm:flex">
            <FolderOpen className="h-4 w-4 mr-2" />
            Открыть
          </Button>
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
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Настройки проекта будут доступны в следующих обновлениях.</p>
            <div className="space-y-2">
              <p><strong className="text-foreground">Версия:</strong> 1.0.0</p>
              <p><strong className="text-foreground">Движок:</strong> Web Audio API</p>
              <p><strong className="text-foreground">Форматы:</strong> WAV, MP3</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

Header.displayName = 'Header';

export default Header;
