import { forwardRef } from 'react';
import { Music, Settings, HelpCircle, Save, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  projectName?: string;
  onSave?: () => void;
  onOpen?: () => void;
  className?: string;
}

const Header = forwardRef<HTMLElement, HeaderProps>(({
  projectName = 'Новый проект',
  onSave,
  onOpen,
  className,
}, ref) => {
  return (
    <header
      ref={ref}
      className={cn(
        'h-14 px-4 flex items-center justify-between',
        'bg-card/80 backdrop-blur-lg border-b border-border/50',
        className
      )}
    >
      {/* Logo & Project Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-cyan">
            <Music className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SoundStorm
          </span>
        </div>

        <div className="h-6 w-px bg-border mx-2 hidden sm:block" />

        <span className="text-sm text-muted-foreground hidden sm:block">
          {projectName}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onOpen} className="hidden sm:flex">
          <FolderOpen className="h-4 w-4 mr-2" />
          Открыть
        </Button>
        <Button variant="ghost" size="sm" onClick={onSave} className="hidden sm:flex">
          <Save className="h-4 w-4 mr-2" />
          Сохранить
        </Button>
        
        <div className="h-6 w-px bg-border mx-1" />

        <Button variant="ghost" size="icon-sm">
          <HelpCircle className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
