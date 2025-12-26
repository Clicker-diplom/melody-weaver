import { useNavigate } from 'react-router-dom';
import { Music, Wand2, FileAudio, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import { cn } from '@/lib/utils';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header />

      <main className="container max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center py-12 animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Профессиональная обработка аудио</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              SoundForge
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            Создавайте и редактируйте музыку с профессиональными эффектами, 
            визуализацией и экспортом
          </p>
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
              <h2 className="text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                Редактор
              </h2>

              {/* Description */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Загрузите свой аудиофайл и редактируйте его: 
                добавляйте эффекты, обрезайте, изменяйте громкость, 
                применяйте фильтры и экспортируйте результат.
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['WAV', 'MP3', 'FLAC', 'OGG'].map(format => (
                  <span key={format} className="px-3 py-1 text-xs font-mono rounded-full bg-primary/10 text-primary border border-primary/20">
                    {format}
                  </span>
                ))}
              </div>

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
              <h2 className="text-3xl font-bold mb-4 group-hover:text-secondary transition-colors">
                Создание с нуля
              </h2>

              {/* Description */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Создавайте музыку с нуля используя синтезаторы, 
                секвенсор, эффекты и экспортируйте готовые треки 
                в популярных форматах.
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-6">
                {['Синтез', 'Секвенсор', 'MIDI', 'Экспорт'].map(feature => (
                  <span key={feature} className="px-3 py-1 text-xs font-mono rounded-full bg-secondary/10 text-secondary border border-secondary/20">
                    {feature}
                  </span>
                ))}
              </div>

              {/* Action */}
              <div className="flex items-center gap-2 text-secondary font-medium">
                <span>Начать создание</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h3 className="text-center text-2xl font-semibold mb-10 text-muted-foreground">
            Возможности платформы
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🎛️', title: 'Эффекты', desc: 'Delay, Reverb, Filter' },
              { icon: '✂️', title: 'Редактирование', desc: 'Обрезка, копирование' },
              { icon: '📊', title: 'Визуализация', desc: 'Waveform, спектр' },
              { icon: '💾', title: 'Экспорт', desc: 'WAV, MP3, FLAC' },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="text-center p-6 rounded-2xl glass hover:bg-card/60 transition-all duration-300"
              >
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
