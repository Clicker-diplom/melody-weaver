import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface GeneratedNote {
  pitch: number;
  octave: number;
  start: number;
  duration: number;
}

interface GeneratedTrack {
  name: string;
  synth: string;
  color: string;
  notes: GeneratedNote[];
}

interface AIMelodyGeneratorProps {
  onGenerate: (tracks: GeneratedTrack[]) => void;
}

const moods = [
  { value: 'happy', label: 'Весёлое' },
  { value: 'sad', label: 'Грустное' },
  { value: 'energetic', label: 'Энергичное' },
  { value: 'calm', label: 'Спокойное' },
  { value: 'dark', label: 'Тёмное' },
  { value: 'epic', label: 'Эпическое' },
  { value: 'dreamy', label: 'Мечтательное' },
];

const genres = [
  { value: 'electronic', label: 'Электроника' },
  { value: 'pop', label: 'Поп' },
  { value: 'rock', label: 'Рок' },
  { value: 'classical', label: 'Классика' },
  { value: 'jazz', label: 'Джаз' },
  { value: 'ambient', label: 'Эмбиент' },
  { value: 'hip-hop', label: 'Хип-хоп' },
  { value: 'lofi', label: 'Lo-Fi' },
];

const keys = [
  { value: 'C major', label: 'До мажор' },
  { value: 'A minor', label: 'Ля минор' },
  { value: 'G major', label: 'Соль мажор' },
  { value: 'E minor', label: 'Ми минор' },
  { value: 'D major', label: 'Ре мажор' },
  { value: 'F major', label: 'Фа мажор' },
];

export default function AIMelodyGenerator({ onGenerate }: AIMelodyGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mood, setMood] = useState('happy');
  const [genre, setGenre] = useState('electronic');
  const [musicalKey, setMusicalKey] = useState('C major');

  const handleGenerate = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-melody`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            mood,
            genre,
            key: musicalKey,
            tempo: 120,
            bars: 8,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate melody');
      }

      const data = await response.json();
      
      if (data.tracks && Array.isArray(data.tracks)) {
        onGenerate(data.tracks);
        toast.success('Мелодия сгенерирована!');
        setIsOpen(false);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка генерации');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="glass" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Генерация
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Генератор мелодий
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Настроение</label>
            <Select value={mood} onValueChange={setMood}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {moods.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Жанр</label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {genres.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Тональность</label>
            <Select value={musicalKey} onValueChange={setMusicalKey}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {keys.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleGenerate} 
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Сгенерировать мелодию
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            AI создаст несколько треков с мелодией и басом
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
