import { useState, useRef } from 'react';
import { Upload, Music, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  className?: string;
}

const FileUpload = ({
  onFileSelect,
  acceptedFormats = ['.wav', '.mp3', '.flac', '.ogg'],
  className,
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && isValidFormat(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const isValidFormat = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return acceptedFormats.includes(ext);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={acceptedFormats.join(',')}
        onChange={handleFileChange}
        className="hidden"
        id="audio-upload"
      />

      {!selectedFile ? (
        <label
          htmlFor="audio-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-4 p-8',
            'rounded-2xl border-2 border-dashed cursor-pointer',
            'transition-all duration-300',
            isDragging
              ? 'border-primary bg-primary/10 glow-cyan'
              : 'border-border/50 hover:border-primary/50 hover:bg-muted/20'
          )}
        >
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              'bg-gradient-to-br from-primary/20 to-secondary/20',
              'border border-primary/30',
              isDragging && 'animate-pulse'
            )}
          >
            <Upload className="h-7 w-7 text-primary" />
          </div>

          <div className="text-center">
            <p className="text-lg font-medium text-foreground mb-1">
              Перетащите аудиофайл сюда
            </p>
            <p className="text-sm text-muted-foreground">
              или нажмите для выбора
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            {acceptedFormats.map(format => (
              <span
                key={format}
                className="px-2 py-1 text-xs font-mono rounded bg-muted text-muted-foreground"
              >
                {format}
              </span>
            ))}
          </div>
        </label>
      ) : (
        <div className="flex items-center gap-4 p-4 rounded-xl glass">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
            <Music className="h-6 w-6 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={clearFile}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
