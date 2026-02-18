import { useState, useRef } from 'react';
import { Upload, Music, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_MIME_TYPES = [
  'audio/wav', 'audio/x-wav',
  'audio/mpeg', 'audio/mp3',
  'audio/flac',
  'audio/ogg', 'audio/vorbis',
  'audio/aac',
  'audio/webm',
];

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  className?: string;
}

interface ValidationError {
  message: string;
  detail: string;
}

function validateFile(file: File, acceptedFormats: string[]): ValidationError | null {
  // Check extension
  const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '');
  if (!acceptedFormats.includes(ext)) {
    return {
      message: 'Неподдерживаемый формат файла',
      detail: `Файл "${file.name}" имеет формат ${ext}. Допустимые форматы: ${acceptedFormats.join(', ')}`,
    };
  }

  // Check MIME type (if browser provides it)
  if (file.type && !ALLOWED_MIME_TYPES.some(m => file.type.startsWith(m.split('/')[0]))) {
    return {
      message: 'Файл не является аудио',
      detail: `Тип файла "${file.type}" не соответствует аудиоформату.`,
    };
  }

  // Check size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      message: 'Файл слишком большой',
      detail: `Размер файла ${sizeMB} МБ превышает лимит в ${MAX_FILE_SIZE / (1024 * 1024)} МБ.`,
    };
  }

  // Check empty file
  if (file.size === 0) {
    return {
      message: 'Файл пустой',
      detail: 'Загруженный файл не содержит данных.',
    };
  }

  return null;
}

const FileUpload = ({
  onFileSelect,
  acceptedFormats = ['.wav', '.mp3', '.flac', '.ogg'],
  className,
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<ValidationError | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    setError(null);
    const validationError = validateFile(file, acceptedFormats);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const clearFile = () => {
    setSelectedFile(null);
    setError(null);
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

      {/* Validation Error */}
      {error && (
        <div className="mb-4 p-4 rounded-xl border border-destructive/50 bg-destructive/10 flex items-start gap-3 animate-slide-up">
          <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-destructive">{error.message}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{error.detail}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setError(null)}
            className="text-muted-foreground hover:text-destructive shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
            error
              ? 'border-destructive/50 hover:border-destructive'
              : isDragging
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
              или нажмите для выбора • макс. {MAX_FILE_SIZE / (1024 * 1024)} МБ
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
