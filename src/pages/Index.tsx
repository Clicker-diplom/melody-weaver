import { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, FileAudio, ArrowRight } from 'lucide-react';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';

const Index = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();

  return (
    <div ref={ref} className="min-h-screen bg-background gradient-mesh">
      <Header />

      <main className="container max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center py-12 animate-slide-up">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              SoundForge
            </span>
          </h1>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {/* Editor Card */}
          <div
            onClick={() => navigate('/editor')}
            className={cn(
              'group relative p-8 rounded-3xl cursor-pointer transition-all duration-500',
              'glass hover:bg-card/80',
              'border border-border/50 hover:border-primary/50',
              'hover:glow-cyan hover:scale-[1.02]'
            )}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <FileAudio className="h-10 w-10 text-primary" />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold mb-6 group-hover:text-primary transition-colors">
                Редактор
              </h2>

              {/* Action */}
              <div className="flex items-center gap-2 text-primary font-medium">
                <span>Открыть редактор</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </div>

          {/* Creator Card */}
          <div
            onClick={() => navigate('/creator')}
            className={cn(
              'group relative p-8 rounded-3xl cursor-pointer transition-all duration-500',
              'glass hover:bg-card/80',
              'border border-border/50 hover:border-secondary/50',
              'hover:glow-magenta hover:scale-[1.02]'
            )}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-secondary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              {/* Icon */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-secondary/20 to-secondary/5 border border-secondary/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Wand2 className="h-10 w-10 text-secondary" />
              </div>

              {/* Title */}
              <h2 className="text-3xl font-bold mb-6 group-hover:text-secondary transition-colors">
                Создание с нуля
              </h2>

              {/* Action */}
              <div className="flex items-center gap-2 text-secondary font-medium">
                <span>Начать создание</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
});

Index.displayName = 'Index';

export default Index;
