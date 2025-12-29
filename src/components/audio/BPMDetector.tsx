import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { detectBPM, analyzeRhythmPatterns } from '@/lib/bpmDetection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

interface BPMDetectorProps {
  audioBuffer: AudioBuffer | null;
  onBPMDetected: (bpm: number) => void;
}

export default function BPMDetector({ audioBuffer, onBPMDetected }: BPMDetectorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<{
    bpm: number;
    confidence: number;
    downbeats: number[];
  } | null>(null);

  const handleAnalyze = async () => {
    if (!audioBuffer) {
      toast.error('Сначала загрузите аудиофайл');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Run ML analysis in next tick to allow UI update
      await new Promise(resolve => setTimeout(resolve, 50));

      const bpmResult = await detectBPM(audioBuffer);
      const rhythmResult = analyzeRhythmPatterns(audioBuffer);

      setResults({
        bpm: bpmResult.bpm,
        confidence: bpmResult.confidence,
        downbeats: rhythmResult.downbeats.slice(0, 8), // First 8 downbeats
      });

      setShowResults(true);
      toast.success(`BPM обнаружен: ${bpmResult.bpm}`);
    } catch (error) {
      console.error('BPM detection error:', error);
      toast.error('Ошибка анализа аудио');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyBPM = () => {
    if (results) {
      onBPMDetected(results.bpm);
      setShowResults(false);
      toast.success(`BPM установлен: ${results.bpm}`);
    }
  };

  return (
    <>
      <Button
        variant="glass"
        size="sm"
        onClick={handleAnalyze}
        disabled={!audioBuffer || isAnalyzing}
        className="gap-2"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Анализ...
          </>
        ) : (
          <>
            <Activity className="h-4 w-4" />
            ML Детекция BPM
          </>
        )}
      </Button>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Результаты ML-анализа
            </DialogTitle>
          </DialogHeader>

          {results && (
            <div className="space-y-6 py-4">
              {/* BPM Result */}
              <div className="text-center">
                <div className="text-6xl font-bold text-primary mb-2">
                  {results.bpm}
                </div>
                <div className="text-sm text-muted-foreground">
                  ударов в минуту (BPM)
                </div>
              </div>

              {/* Confidence */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Уверенность</span>
                  <span className="font-mono">{Math.round(results.confidence * 100)}%</span>
                </div>
                <Progress value={results.confidence * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {results.confidence > 0.7
                    ? 'Высокая точность детекции'
                    : results.confidence > 0.4
                    ? 'Средняя точность'
                    : 'Низкая точность - возможно сложный ритм'}
                </p>
              </div>

              {/* Algorithm Info */}
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <div className="font-medium mb-1">Алгоритм анализа:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Spectral Flux Onset Detection</li>
                  <li>Autocorrelation для периодичности</li>
                  <li>RMS Energy Analysis</li>
                </ul>
              </div>

              {/* Downbeats */}
              {results.downbeats.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Сильные доли (первые 8):</div>
                  <div className="flex flex-wrap gap-1">
                    {results.downbeats.map((time, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-primary/20 rounded text-xs font-mono"
                      >
                        {time.toFixed(2)}s
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Apply Button */}
              <Button onClick={handleApplyBPM} className="w-full">
                Применить BPM {results.bpm}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
