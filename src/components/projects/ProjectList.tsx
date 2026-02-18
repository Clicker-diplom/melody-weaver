import { Upload, FileAudio, Download, Trash2, Clock, HardDrive, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Project } from '@/hooks/useProjects';

interface ProjectListProps {
  projects: Project[];
  loading: boolean;
  onDelete: (id: string) => void;
}

const typeConfig = {
  uploaded: { label: 'Загружен', icon: Upload, color: 'text-primary' },
  edited: { label: 'Отредактирован', icon: FileAudio, color: 'text-secondary' },
  exported: { label: 'Экспортирован', icon: Download, color: 'text-accent' },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ProjectList = ({ projects, loading, onDelete }: ProjectListProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
          <FileAudio className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-lg font-medium text-muted-foreground">Нет проектов</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Загрузите или создайте аудиофайл, чтобы он появился здесь
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map((project) => {
        const config = typeConfig[project.type];
        const Icon = config.icon;

        return (
          <div
            key={project.id}
            className={cn(
              'flex items-center gap-4 p-4 rounded-xl',
              'glass hover:bg-card/80 transition-all duration-200',
              'group'
            )}
          >
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              'bg-muted/50 border border-border/50'
            )}>
              <Icon className={cn('h-5 w-5', config.color)} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{project.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className={cn('font-medium', config.color)}>{config.label}</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(project.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  {formatFileSize(project.file_size)}
                </span>
              </div>
            </div>

            <span className="text-xs text-muted-foreground hidden sm:block">
              {formatDate(project.created_at)}
            </span>

            <div className="flex items-center gap-1">
              {project.file_url && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  asChild
                  className="text-muted-foreground hover:text-primary transition-all"
                >
                  <a href={project.file_url} target="_blank" rel="noopener noreferrer" download>
                    <Link className="h-4 w-4" />
                  </a>
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(project.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectList;
