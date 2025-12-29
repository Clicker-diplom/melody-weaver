import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Upload, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import EffectsPanel from '@/components/audio/EffectsPanel';
import TransportControls from '@/components/audio/TransportControls';
import VolumeControl from '@/components/audio/VolumeControl';
import ExportDialog from '@/components/audio/ExportDialog';
import AudioTrackEditor, { type AudioTrackData, type AudioRegion } from '@/components/audio/AudioTrackEditor';
import BPMDetector from '@/components/audio/BPMDetector';
import { cn } from '@/lib/utils';
import type { AudioEffects } from '@/hooks/useAudioEngine';

interface Note {
  id: string;
  pitch: number;
  octave: number;
  start: number;
  duration: number;
}

type SynthType = 'lead' | 'bass' | 'pad' | 'pluck' | 'keys' | 'strings' | 'brass' | 'bells' | 'organ' | 'marimba' | 'choir' | 'synth';

interface Track {
  id: string;
  name: string;
  color: string;
  synth: SynthType;
  notes: Note[];
  volume: number;
  muted: boolean;
}

// AudioTrackData is imported from AudioTrackEditor

const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const octaves = [5, 4, 3, 2];

const synthNames: Record<SynthType, string> = {
  lead: 'Lead',
  bass: 'Бас',
  pad: 'Pad',
  pluck: 'Pluck',
  keys: 'Keys',
  strings: 'Strings',
  brass: 'Brass',
  bells: 'Bells',
  organ: 'Орган',
  marimba: 'Маримба',
  choir: 'Хор',
  synth: 'Синт'
};

const Creator = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [bpm, setBpm] = useState(120);
  const [totalBeats] = useState(32);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<string>('track-1');
  const [isExporting, setIsExporting] = useState(false);
  const [effects, setEffects] = useState<AudioEffects>({
    delay: { enabled: false, time: 350, feedback: 40, mix: 30 },
    reverb: { enabled: false, size: 60, decay: 45, mix: 35 },
    filter: { enabled: false, cutoff: 8000, resonance: 20 },
    distortion: { enabled: false, drive: 30, tone: 50, mix: 50 },
    compressor: { enabled: false, threshold: -24, ratio: 4, attack: 10, release: 100 },
    eq: { enabled: false, low: 0, mid: 0, high: 0 },
    chorus: { enabled: false, rate: 1.5, depth: 50, mix: 50 },
    phaser: { enabled: false, rate: 0.5, depth: 50, feedback: 50 },
  });

  const [tracks, setTracks] = useState<Track[]>([
    {
      id: 'track-1',
      name: 'Мелодия',
      color: 'hsl(187, 100%, 50%)',
      synth: 'lead',
      notes: [
        { id: 'n1', pitch: 0, octave: 4, start: 0, duration: 2 },
        { id: 'n2', pitch: 4, octave: 4, start: 2, duration: 2 },
        { id: 'n3', pitch: 7, octave: 4, start: 4, duration: 2 },
        { id: 'n4', pitch: 5, octave: 4, start: 6, duration: 2 },
      ],
      volume: 100,
      muted: false,
    },
    {
      id: 'track-2',
      name: 'Бас',
      color: 'hsl(328, 100%, 50%)',
      synth: 'bass',
      notes: [
        { id: 'b1', pitch: 0, octave: 2, start: 0, duration: 4 },
        { id: 'b2', pitch: 5, octave: 2, start: 4, duration: 4 },
      ],
      volume: 80,
      muted: false,
    },
  ]);

  const [audioTracks, setAudioTracks] = useState<AudioTrackData[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const audioSourcesRef = useRef<Map<string, AudioBufferSourceNode>>(new Map());

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);
  const delayFeedbackRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const distortionNodeRef = useRef<WaveShaperNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create distortion curve
  const makeDistortionCurve = useCallback((amount: number) => {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; i++) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }, []);

  // Create reverb impulse response
  const createReverbImpulse = useCallback((ctx: AudioContext, duration: number, decay: number) => {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
    }
    return impulse;
  }, []);

  // Initialize audio context with effects chain
  useEffect(() => {
    const ctx = new AudioContext();
    audioContextRef.current = ctx;
    
    // Create nodes
    masterGainRef.current = ctx.createGain();
    masterGainRef.current.gain.value = 0.75; // Initial volume 75%
    dryGainRef.current = ctx.createGain();
    
    // Delay
    delayNodeRef.current = ctx.createDelay(2);
    delayGainRef.current = ctx.createGain();
    delayFeedbackRef.current = ctx.createGain();
    
    // Filter
    filterNodeRef.current = ctx.createBiquadFilter();
    filterNodeRef.current.type = 'lowpass';
    filterNodeRef.current.frequency.value = 20000;
    
    // Distortion
    distortionNodeRef.current = ctx.createWaveShaper();
    distortionNodeRef.current.oversample = '4x';
    
    // Reverb
    convolverNodeRef.current = ctx.createConvolver();
    reverbGainRef.current = ctx.createGain();
    convolverNodeRef.current.buffer = createReverbImpulse(ctx, 2, 2);
    
    // Connect: master -> filter -> distortion -> dry + delay + reverb -> destination
    masterGainRef.current.connect(filterNodeRef.current);
    filterNodeRef.current.connect(distortionNodeRef.current);
    
    // Dry path
    distortionNodeRef.current.connect(dryGainRef.current);
    dryGainRef.current.connect(ctx.destination);
    
    // Delay path
    distortionNodeRef.current.connect(delayNodeRef.current);
    delayNodeRef.current.connect(delayGainRef.current);
    delayGainRef.current.connect(ctx.destination);
    delayNodeRef.current.connect(delayFeedbackRef.current);
    delayFeedbackRef.current.connect(delayNodeRef.current);
    
    // Reverb path
    distortionNodeRef.current.connect(convolverNodeRef.current);
    convolverNodeRef.current.connect(reverbGainRef.current);
    reverbGainRef.current.connect(ctx.destination);
    
    return () => {
      ctx.close();
    };
  }, [createReverbImpulse]);

  // Update effects parameters
  useEffect(() => {
    if (!audioContextRef.current) return;
    
    // Delay
    if (delayNodeRef.current && delayGainRef.current && delayFeedbackRef.current) {
      delayNodeRef.current.delayTime.value = effects.delay.time / 1000;
      delayGainRef.current.gain.value = effects.delay.enabled ? effects.delay.mix / 100 : 0;
      delayFeedbackRef.current.gain.value = effects.delay.enabled ? effects.delay.feedback / 100 : 0;
    }
    
    // Filter
    if (filterNodeRef.current) {
      filterNodeRef.current.frequency.value = effects.filter.enabled ? effects.filter.cutoff : 20000;
      filterNodeRef.current.Q.value = effects.filter.enabled ? effects.filter.resonance / 5 : 0.5;
    }
    
    // Distortion
    if (distortionNodeRef.current) {
      if (effects.distortion.enabled) {
        distortionNodeRef.current.curve = makeDistortionCurve(effects.distortion.drive * 2);
      } else {
        distortionNodeRef.current.curve = null;
      }
    }
    
    // Reverb
    if (reverbGainRef.current) {
      reverbGainRef.current.gain.value = effects.reverb.enabled ? effects.reverb.mix / 100 : 0;
    }
    
    // Update reverb impulse
    if (convolverNodeRef.current && effects.reverb.enabled) {
      const size = effects.reverb.size / 30;
      const decay = effects.reverb.decay / 20;
      convolverNodeRef.current.buffer = createReverbImpulse(audioContextRef.current, size, decay);
    }
    
    // Dry gain
    if (dryGainRef.current) {
      const wetMix = (
        (effects.delay.enabled ? effects.delay.mix / 100 : 0) +
        (effects.reverb.enabled ? effects.reverb.mix / 100 : 0)
      ) / 2;
      dryGainRef.current.gain.value = 1 - wetMix * 0.5;
    }
  }, [effects, makeDistortionCurve, createReverbImpulse]);

  // Update volume
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Create synth voice based on type
  const createSynthVoice = useCallback((
    ctx: AudioContext,
    synthType: SynthType,
    frequency: number,
    startTime: number,
    duration: number,
    velocity: number = 0.3
  ): { connect: (node: AudioNode) => void; start: () => void; stop: () => void } => {
    const voices: OscillatorNode[] = [];
    const outputGain = ctx.createGain();
    
    switch (synthType) {
      case 'lead': {
        // Lead: detuned saws with filter
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 3000;
        filter.Q.value = 2;
        
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = frequency * (1 + (i - 0.5) * 0.01);
          const g = ctx.createGain();
          g.gain.value = velocity * 0.4;
          osc.connect(g);
          g.connect(filter);
          voices.push(osc);
        }
        filter.connect(outputGain);
        
        outputGain.gain.setValueAtTime(0.001, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.02);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
      
      case 'bass': {
        // Bass: sub + filtered saw
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 3;
        
        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = frequency;
        const subGain = ctx.createGain();
        subGain.gain.value = velocity * 0.6;
        sub.connect(subGain);
        subGain.connect(outputGain);
        voices.push(sub);
        
        const saw = ctx.createOscillator();
        saw.type = 'sawtooth';
        saw.frequency.value = frequency;
        const sawGain = ctx.createGain();
        sawGain.gain.value = velocity * 0.3;
        saw.connect(filter);
        filter.connect(sawGain);
        sawGain.connect(outputGain);
        voices.push(saw);
        
        outputGain.gain.setValueAtTime(0.001, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.01);
        outputGain.gain.setValueAtTime(1, startTime + duration * 0.8);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
      
      case 'pad': {
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = frequency * (1 + (i - 1.5) * 0.005);
          const g = ctx.createGain();
          g.gain.value = velocity * 0.2;
          osc.connect(g);
          g.connect(outputGain);
          voices.push(osc);
        }
        
        outputGain.gain.setValueAtTime(0.001, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.15);
        outputGain.gain.setValueAtTime(1, startTime + duration * 0.7);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
      
      case 'pluck': {
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = frequency * 2;
        filter.Q.value = 5;
        
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = frequency;
        const g = ctx.createGain();
        g.gain.value = velocity * 0.5;
        osc.connect(filter);
        filter.connect(g);
        g.connect(outputGain);
        voices.push(osc);
        
        outputGain.gain.setValueAtTime(1, startTime);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 0.5));
        break;
      }
      
      case 'keys': {
        const harmonics = [1, 2, 3, 4];
        const amps = [0.5, 0.3, 0.15, 0.05];
        
        harmonics.forEach((h, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = frequency * h;
          const g = ctx.createGain();
          g.gain.value = velocity * amps[i];
          osc.connect(g);
          g.connect(outputGain);
          voices.push(osc);
        });
        
        outputGain.gain.setValueAtTime(0.001, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.01);
        outputGain.gain.setValueAtTime(0.8, startTime + duration * 0.9);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
      
      case 'strings': {
        // Strings: layered saws with slow attack and vibrato
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2500;
        filter.Q.value = 0.7;
        
        // Vibrato LFO
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 3;
        lfo.connect(lfoGain);
        lfo.start(startTime);
        lfo.stop(startTime + duration);
        
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = frequency * (1 + (i - 1) * 0.003);
          lfoGain.connect(osc.frequency);
          const g = ctx.createGain();
          g.gain.value = velocity * 0.25;
          osc.connect(g);
          g.connect(filter);
          voices.push(osc);
        }
        filter.connect(outputGain);
        
        // Slow string-like attack
        outputGain.gain.setValueAtTime(0.001, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.2);
        outputGain.gain.setValueAtTime(0.9, startTime + duration * 0.7);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
      
      case 'brass': {
        // Brass: filtered saws with quick attack and growl
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1800;
        filter.Q.value = 4;
        
        // Filter envelope
        filter.frequency.setValueAtTime(500, startTime);
        filter.frequency.exponentialRampToValueAtTime(1800, startTime + 0.08);
        
        for (let i = 0; i < 2; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = frequency * (1 + (i - 0.5) * 0.006);
          const g = ctx.createGain();
          g.gain.value = velocity * 0.4;
          osc.connect(g);
          g.connect(filter);
          voices.push(osc);
        }
        filter.connect(outputGain);
        
        outputGain.gain.setValueAtTime(0.001, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.05);
        outputGain.gain.setValueAtTime(0.85, startTime + duration * 0.8);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
      
      case 'bells': {
        // Bells: FM synthesis with bright harmonics
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = frequency;
        
        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = frequency * 3.5; // Non-harmonic ratio for bell-like sound
        
        const modGain = ctx.createGain();
        modGain.gain.value = frequency * 2; // FM depth
        modGain.gain.setValueAtTime(frequency * 2, startTime);
        modGain.gain.exponentialRampToValueAtTime(frequency * 0.1, startTime + duration);
        
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        
        const carrierGain = ctx.createGain();
        carrierGain.gain.value = velocity * 0.4;
        carrier.connect(carrierGain);
        carrierGain.connect(outputGain);
        
        modulator.start(startTime);
        modulator.stop(startTime + duration);
        voices.push(carrier);
        
        // Quick attack, long decay like a real bell
        outputGain.gain.setValueAtTime(1, startTime);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.max(duration, 1));
        break;
      }
      
      case 'organ': {
        // Organ: drawbar-style additive synthesis
        const harmonics = [1, 2, 3, 4, 5, 6, 8];
        const drawbars = [1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1];
        
        harmonics.forEach((h, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = frequency * h;
          const g = ctx.createGain();
          g.gain.value = velocity * drawbars[i] * 0.15;
          osc.connect(g);
          g.connect(outputGain);
          voices.push(osc);
        });
        
        // Slight click on attack like a real organ
        outputGain.gain.setValueAtTime(1.2, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.02);
        outputGain.gain.setValueAtTime(1, startTime + duration - 0.02);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
      
      case 'marimba': {
        // Marimba: FM synthesis with quick decay
        const carrier = ctx.createOscillator();
        carrier.type = 'sine';
        carrier.frequency.value = frequency;
        
        const modulator = ctx.createOscillator();
        modulator.type = 'sine';
        modulator.frequency.value = frequency * 4;
        
        const modGain = ctx.createGain();
        modGain.gain.value = frequency * 0.8;
        modGain.gain.setValueAtTime(frequency * 0.8, startTime);
        modGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        
        // Sub harmonic for warmth
        const sub = ctx.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = frequency * 0.5;
        const subGain = ctx.createGain();
        subGain.gain.value = velocity * 0.3;
        sub.connect(subGain);
        subGain.connect(outputGain);
        voices.push(sub);
        
        const carrierGain = ctx.createGain();
        carrierGain.gain.value = velocity * 0.5;
        carrier.connect(carrierGain);
        carrierGain.connect(outputGain);
        
        modulator.start(startTime);
        modulator.stop(startTime + duration);
        voices.push(carrier);
        
        outputGain.gain.setValueAtTime(1, startTime);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 0.8));
        break;
      }
      
      case 'choir': {
        // Choir: layered voices with formants and vibrato
        const formantFreqs = [800, 1200, 2600]; // Vowel "Ah"
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = formantFreqs[0];
        filter.Q.value = 3;
        
        // Vibrato LFO
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 4.5;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 4;
        lfo.connect(lfoGain);
        lfo.start(startTime);
        lfo.stop(startTime + duration);
        
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = frequency * (1 + (i - 1.5) * 0.008);
          lfoGain.connect(osc.frequency);
          const g = ctx.createGain();
          g.gain.value = velocity * 0.18;
          osc.connect(g);
          g.connect(filter);
          voices.push(osc);
        }
        filter.connect(outputGain);
        
        outputGain.gain.setValueAtTime(0.001, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.25);
        outputGain.gain.setValueAtTime(0.9, startTime + duration * 0.7);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
      
      case 'synth': {
        // Synth: aggressive supersaw with filter sweep
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;
        filter.Q.value = 8;
        
        // Filter sweep
        filter.frequency.setValueAtTime(400, startTime);
        filter.frequency.exponentialRampToValueAtTime(4000, startTime + 0.1);
        filter.frequency.exponentialRampToValueAtTime(1500, startTime + duration * 0.5);
        
        for (let i = 0; i < 5; i++) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = frequency * (1 + (i - 2) * 0.015);
          const g = ctx.createGain();
          g.gain.value = velocity * 0.2;
          osc.connect(g);
          g.connect(filter);
          voices.push(osc);
        }
        filter.connect(outputGain);
        
        outputGain.gain.setValueAtTime(0.001, startTime);
        outputGain.gain.exponentialRampToValueAtTime(1, startTime + 0.01);
        outputGain.gain.setValueAtTime(0.8, startTime + duration * 0.85);
        outputGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        break;
      }
    }
    
    return {
      connect: (node: AudioNode) => outputGain.connect(node),
      start: () => voices.forEach(v => v.start(startTime)),
      stop: () => voices.forEach(v => v.stop(startTime + duration))
    };
  }, []);

  // Playback loop with note triggering
  useEffect(() => {
    if (isPlaying) {
      const beatDuration = 60 / bpm;
      let lastBeat = -1;
      
      playIntervalRef.current = setInterval(() => {
        setCurrentBeat(prev => {
          const next = prev + 0.125;
          const currentBeatInt = Math.floor(next);
          
          if (currentBeatInt !== lastBeat && audioContextRef.current && masterGainRef.current) {
            lastBeat = currentBeatInt;
            
            tracks.forEach(track => {
              if (track.muted) return;
              
              track.notes.forEach(note => {
                if (note.start === currentBeatInt) {
                  const frequency = 440 * Math.pow(2, (note.pitch - 9 + (note.octave - 4) * 12) / 12);
                  const noteDuration = note.duration * beatDuration;
                  
                  const voice = createSynthVoice(
                    audioContextRef.current!,
                    track.synth,
                    frequency,
                    audioContextRef.current!.currentTime,
                    noteDuration,
                    0.3 * (track.volume / 100)
                  );
                  
                  voice.connect(masterGainRef.current!);
                  voice.start();
                  voice.stop();
                }
              });
            });
          }
          
          if (next >= totalBeats) {
            return 0;
          }
          return next;
        });
      }, (beatDuration * 1000) / 8);
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, bpm, totalBeats, tracks, createSynthVoice]);

  const playNote = useCallback((pitch: number, octave: number, duration: number = 0.3, synthType: SynthType = 'lead') => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    const frequency = 440 * Math.pow(2, (pitch - 9 + (octave - 4) * 12) / 12);
    const voice = createSynthVoice(
      audioContextRef.current,
      synthType,
      frequency,
      audioContextRef.current.currentTime,
      duration,
      0.3
    );
    
    voice.connect(masterGainRef.current);
    voice.start();
    voice.stop();
  }, [createSynthVoice]);

  const handlePlay = useCallback(() => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Start audio tracks
    const beatDuration = 60 / bpm;
    const startOffset = currentBeat * beatDuration;
    
    audioTracks.forEach(track => {
      if (track.muted) return;
      
      // Play each region
      track.regions.forEach(region => {
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = track.buffer;
        
        const gainNode = audioContextRef.current!.createGain();
        gainNode.gain.value = track.volume / 100;
        
        source.connect(gainNode);
        gainNode.connect(masterGainRef.current!);
        
        const regionDuration = region.endTime - region.startTime;
        const trackOffset = region.startBeat * beatDuration;
        const audioStartTime = Math.max(0, startOffset - trackOffset);
        const scheduleDelay = Math.max(0, trackOffset - startOffset);
        
        // Only play if the region is in the future or we're within it
        if (scheduleDelay > 0 || audioStartTime < regionDuration) {
          source.start(
            audioContextRef.current!.currentTime + scheduleDelay, 
            region.startTime + Math.min(audioStartTime, regionDuration),
            Math.max(0, regionDuration - audioStartTime)
          );
          audioSourcesRef.current.set(`${track.id}-${region.id}`, source);
        }
      });
    });
    
    setIsPlaying(true);
    toast.success('Воспроизведение');
  }, [bpm, currentBeat, audioTracks]);

  const handlePause = useCallback(() => {
    // Stop all audio track sources
    audioSourcesRef.current.forEach((source, id) => {
      try { source.stop(); } catch {}
    });
    audioSourcesRef.current.clear();
    
    setIsPlaying(false);
  }, []);

  const handleStop = useCallback(() => {
    // Stop all audio track sources
    audioSourcesRef.current.forEach((source, id) => {
      try { source.stop(); } catch {}
    });
    audioSourcesRef.current.clear();
    
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const addNote = useCallback((trackId: string, pitch: number, octave: number, beat: number) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      pitch,
      octave,
      start: beat,
      duration: 1,
    };
    
    const track = tracks.find(t => t.id === trackId);
    
    setTracks(prev => prev.map(t => 
      t.id === trackId
        ? { ...t, notes: [...t.notes, newNote] }
        : t
    ));
    
    if (track) {
      playNote(pitch, octave, 0.3, track.synth);
    }
  }, [playNote, tracks]);

  const removeNote = useCallback((trackId: string, noteId: string) => {
    setTracks(prev => prev.map(track =>
      track.id === trackId
        ? { ...track, notes: track.notes.filter(n => n.id !== noteId) }
        : track
    ));
  }, []);

  const changeTrackSynth = useCallback((trackId: string, synth: SynthType) => {
    setTracks(prev => prev.map(t =>
      t.id === trackId ? { ...t, synth } : t
    ));
  }, []);

  const addTrack = useCallback(() => {
    const colors = ['hsl(25, 100%, 60%)', 'hsl(142, 70%, 50%)', 'hsl(270, 70%, 60%)', 'hsl(200, 80%, 55%)', 'hsl(340, 75%, 55%)'];
    const synths: SynthType[] = ['pad', 'pluck', 'keys', 'strings', 'brass', 'bells', 'organ', 'marimba', 'choir', 'synth'];
    const newTrack: Track = {
      id: `track-${Date.now()}`,
      name: `Трек ${tracks.length + 1}`,
      color: colors[tracks.length % colors.length],
      synth: synths[tracks.length % synths.length],
      notes: [],
      volume: 100,
      muted: false,
    };
    setTracks(prev => [...prev, newTrack]);
    setSelectedTrack(newTrack.id);
    toast.success('Трек добавлен');
  }, [tracks.length]);

  const deleteTrack = useCallback((trackId: string) => {
    if (tracks.length <= 1) {
      toast.error('Нельзя удалить последний трек');
      return;
    }
    setTracks(prev => prev.filter(t => t.id !== trackId));
    if (selectedTrack === trackId) {
      setSelectedTrack(tracks[0].id);
    }
    toast.success('Трек удалён');
  }, [tracks, selectedTrack]);

  // Audio file handling
  const handleAudioFileSelect = useCallback(async (file: File) => {
    if (!audioContextRef.current) return;
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Create initial region for full track
      const initialRegion: AudioRegion = {
        id: `region-${Date.now()}`,
        startTime: 0,
        endTime: audioBuffer.duration,
        startBeat: 0,
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`,
        label: 'Полный трек',
      };
      
      const newAudioTrack: AudioTrackData = {
        id: `audio-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        file,
        buffer: audioBuffer,
        volume: 100,
        muted: false,
        regions: [initialRegion],
      };
      
      setAudioTracks(prev => [...prev, newAudioTrack]);
      toast.success(`Аудиофайл "${newAudioTrack.name}" добавлен`);
    } catch (error) {
      toast.error('Ошибка загрузки аудиофайла');
      console.error('Error loading audio file:', error);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    
    const file = e.dataTransfer.files[0];
    if (file && /\.(mp3|wav|ogg|flac|m4a)$/i.test(file.name)) {
      handleAudioFileSelect(file);
    } else {
      toast.error('Неподдерживаемый формат файла');
    }
  }, [handleAudioFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAudioFileSelect(file);
    }
  }, [handleAudioFileSelect]);

  const deleteAudioTrack = useCallback((trackId: string) => {
    const source = audioSourcesRef.current.get(trackId);
    if (source) {
      try { source.stop(); } catch {}
      audioSourcesRef.current.delete(trackId);
    }
    setAudioTracks(prev => prev.filter(t => t.id !== trackId));
    toast.success('Аудиотрек удалён');
  }, []);

  const updateAudioTrack = useCallback((updatedTrack: AudioTrackData) => {
    setAudioTracks(prev => prev.map(t => 
      t.id === updatedTrack.id ? updatedTrack : t
    ));
  }, []);

  const handleExport = useCallback(async (format: 'wav' | 'mp3', quality: number) => {
    setIsExporting(true);
    
    try {
      // Render all notes to an audio buffer
      const sampleRate = 44100;
      const beatDuration = 60 / bpm;
      const totalDuration = totalBeats * beatDuration;
      const bufferLength = Math.ceil(totalDuration * sampleRate);
      
      const offlineCtx = new OfflineAudioContext(2, bufferLength, sampleRate);
      
      // Create effect chain in offline context
      const masterGain = offlineCtx.createGain();
      masterGain.gain.value = volume / 100;
      
      const filter = offlineCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = effects.filter.enabled ? effects.filter.cutoff : 20000;
      filter.Q.value = effects.filter.enabled ? effects.filter.resonance / 5 : 0.5;
      
      const distortion = offlineCtx.createWaveShaper();
      if (effects.distortion.enabled) {
        distortion.curve = makeDistortionCurve(effects.distortion.drive * 2);
      }
      
      masterGain.connect(filter);
      filter.connect(distortion);
      distortion.connect(offlineCtx.destination);
      
      // Schedule all notes with proper synth types
      tracks.forEach(track => {
        if (track.muted) return;
        
        track.notes.forEach(note => {
          const frequency = 440 * Math.pow(2, (note.pitch - 9 + (note.octave - 4) * 12) / 12);
          const startTime = note.start * beatDuration;
          const noteDuration = note.duration * beatDuration;
          
          // Simplified synth for export (full synth too complex for offline)
          const osc = offlineCtx.createOscillator();
          const noteGain = offlineCtx.createGain();
          
          // Set oscillator type based on track synth
          switch (track.synth) {
            case 'lead':
              osc.type = 'sawtooth';
              break;
            case 'bass':
              osc.type = 'sine';
              break;
            case 'pad':
              osc.type = 'sine';
              break;
            case 'pluck':
              osc.type = 'triangle';
              break;
            case 'keys':
              osc.type = 'sine';
              break;
          }
          
          osc.frequency.value = frequency;
          
          noteGain.gain.setValueAtTime(0.3 * (track.volume / 100), startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration * 0.9);
          
          osc.connect(noteGain);
          noteGain.connect(masterGain);
          
          osc.start(startTime);
          osc.stop(startTime + noteDuration);
        });
      });
      
      // Add audio tracks to the mix (with regions)
      audioTracks.forEach(track => {
        if (track.muted) return;
        
        track.regions.forEach(region => {
          const source = offlineCtx.createBufferSource();
          source.buffer = track.buffer;
          
          const trackGain = offlineCtx.createGain();
          trackGain.gain.value = (track.volume / 100) * (volume / 100);
          
          source.connect(trackGain);
          trackGain.connect(masterGain);
          
          const startTime = region.startBeat * beatDuration;
          const duration = region.endTime - region.startTime;
          source.start(startTime, region.startTime, duration);
        });
      });
      
      const renderedBuffer = await offlineCtx.startRendering();
      
      // Convert to WAV
      const wavBlob = audioBufferToWav(renderedBuffer);
      
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `composition.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`Композиция экспортирована как ${format.toUpperCase()}`);
    } catch {
      toast.error('Ошибка экспорта');
    } finally {
      setIsExporting(false);
    }
  }, [bpm, totalBeats, tracks, volume, effects, makeDistortionCurve, audioTracks]);

  const currentTrack = tracks.find(t => t.id === selectedTrack);

  return (
    <div className="min-h-screen bg-background gradient-mesh">
      <Header projectName="Создание музыки" />

      <main className="container max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                <span className="text-secondary">Создание</span> музыки
              </h1>
              <p className="text-sm text-muted-foreground">
                Пианоролл • {bpm} BPM
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <BPMDetector
              audioBuffer={audioTracks[0]?.buffer || null}
              onBPMDetected={(detectedBpm) => setBpm(detectedBpm)}
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">BPM:</span>
              <input
                type="number"
                value={bpm}
                onChange={(e) => setBpm(Math.max(40, Math.min(240, parseInt(e.target.value) || 120)))}
                className="w-16 px-2 py-1 text-sm rounded-md bg-muted border border-border text-center font-mono"
              />
            </div>
            <ExportDialog 
              onExport={handleExport} 
              isExporting={isExporting}
            />
          </div>
        </div>

        {/* Transport */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4 animate-slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <TransportControls
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onSkipBack={() => setCurrentBeat(Math.max(0, currentBeat - 4))}
            onSkipForward={() => setCurrentBeat(Math.min(totalBeats, currentBeat + 4))}
          />

          <div className="h-8 w-px bg-border hidden sm:block" />

          <VolumeControl
            volume={volume}
            onChange={setVolume}
            muted={isMuted}
            onMuteToggle={() => setIsMuted(!isMuted)}
          />

          <div className="h-8 w-px bg-border hidden sm:block" />

          <div className="font-mono text-lg">
            <span className="text-primary">{Math.floor(currentBeat / 4) + 1}</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-muted-foreground">{(Math.floor(currentBeat) % 4) + 1}</span>
          </div>
        </div>

        {/* Tracks List */}
        <div className="flex gap-2 overflow-x-auto pb-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {tracks.map(track => (
            <button
              key={track.id}
              onClick={() => setSelectedTrack(track.id)}
              className={cn(
                'flex flex-col items-start gap-0.5 px-4 py-2 rounded-lg transition-all duration-200',
                'border whitespace-nowrap min-w-[140px]',
                selectedTrack === track.id
                  ? 'border-primary bg-primary/20'
                  : 'bg-muted/30 border-border/50 hover:border-border'
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: track.color }}
                />
                <span className="text-sm font-medium">{track.name}</span>
                {tracks.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTrack(track.id);
                    }}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <select
                value={track.synth}
                onChange={(e) => {
                  e.stopPropagation();
                  changeTrackSynth(track.id, e.target.value as SynthType);
                }}
                onClick={(e) => e.stopPropagation()}
                className="text-xs bg-muted/50 border border-border/50 rounded px-1 py-0.5 ml-5 cursor-pointer hover:bg-muted"
              >
                {(Object.keys(synthNames) as SynthType[]).map(s => (
                  <option key={s} value={s}>{synthNames[s]}</option>
                ))}
              </select>
            </button>
          ))}
          <Button variant="glass" size="sm" onClick={addTrack} className="gap-1">
            <Plus className="h-4 w-4" />
            Трек
          </Button>
        </div>

        {/* Audio Tracks Upload Section */}
        <div 
          className="animate-slide-up" 
          style={{ animationDelay: '0.25s' }}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDraggingFile(false); }}
          onDrop={handleFileDrop}
        >
          <input
            ref={audioFileInputRef}
            type="file"
            accept=".mp3,.wav,.ogg,.flac,.m4a"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <div className={cn(
            'glass rounded-xl p-4 transition-all duration-300',
            isDraggingFile && 'ring-2 ring-primary bg-primary/10'
          )}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                Аудиотреки (биты, минусовки)
              </h3>
              <Button 
                variant="glass" 
                size="sm" 
                onClick={() => audioFileInputRef.current?.click()}
                className="gap-1"
              >
                <Upload className="h-4 w-4" />
                Загрузить
              </Button>
            </div>

            {audioTracks.length === 0 ? (
              <div 
                className={cn(
                  'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
                  isDraggingFile 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-border'
                )}
                onClick={() => audioFileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Перетащите аудиофайл сюда или нажмите для выбора
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  MP3, WAV, OGG, FLAC, M4A
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {audioTracks.map(track => (
                  <AudioTrackEditor
                    key={track.id}
                    track={track}
                    bpm={bpm}
                    totalBeats={totalBeats}
                    currentBeat={currentBeat}
                    isPlaying={isPlaying}
                    audioContext={audioContextRef.current}
                    masterGain={masterGainRef.current}
                    onUpdate={updateAudioTrack}
                    onDelete={() => deleteAudioTrack(track.id)}
                    onPlayRegion={() => {}}
                  />
                ))}
                
                <button 
                  onClick={() => audioFileInputRef.current?.click()}
                  className="w-full p-2 border border-dashed border-border/50 rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Добавить ещё
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Piano Roll */}
        <div
          className="glass rounded-2xl p-4 overflow-x-auto animate-slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="min-w-[800px]">
            {/* Beat numbers */}
            <div className="flex ml-16 mb-2">
              {Array.from({ length: totalBeats }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-8 text-center text-xs font-mono',
                    i % 4 === 0 ? 'text-foreground' : 'text-muted-foreground/50'
                  )}
                >
                  {i % 4 === 0 ? i / 4 + 1 : ''}
                </div>
              ))}
            </div>

            {/* Piano keys + grid */}
            <div className="relative">
              {octaves.map(octave => (
                noteNames.map((note, noteIndex) => {
                  const isBlackKey = note.includes('#');
                  const rowKey = `${noteIndex}-${octave}`;
                  
                  return (
                    <div key={rowKey} className="flex h-6">
                      {/* Piano key */}
                      <div
                        className={cn(
                          'w-16 flex items-center justify-end pr-2 text-xs font-mono border-r border-border',
                          isBlackKey ? 'bg-muted/80 text-muted-foreground' : 'bg-muted/40'
                        )}
                      >
                        {note}{octave}
                      </div>

                      {/* Grid cells */}
                      <div className="flex flex-1 relative">
                        {Array.from({ length: totalBeats }).map((_, beat) => {
                          const noteOnBeat = currentTrack?.notes.find(
                            n => n.pitch === noteIndex && n.octave === octave && 
                                beat >= n.start && beat < n.start + n.duration
                          );
                          const isNoteStart = noteOnBeat && beat === noteOnBeat.start;

                          return (
                            <div
                              key={beat}
                              onClick={() => {
                                if (noteOnBeat) {
                                  removeNote(selectedTrack, noteOnBeat.id);
                                } else {
                                  addNote(selectedTrack, noteIndex, octave, beat);
                                }
                              }}
                              className={cn(
                                'w-8 h-6 border-r border-b cursor-pointer transition-colors',
                                beat % 4 === 0 ? 'border-r-border' : 'border-r-border/30',
                                isBlackKey ? 'bg-muted/30' : 'bg-background/50',
                                'hover:bg-primary/20',
                                noteOnBeat && 'bg-transparent'
                              )}
                            >
                              {isNoteStart && noteOnBeat && (
                                <div
                                  className="h-full rounded-sm"
                                  style={{
                                    backgroundColor: currentTrack?.color,
                                    width: `${noteOnBeat.duration * 32}px`,
                                    boxShadow: `0 0 10px ${currentTrack?.color}`,
                                  }}
                                />
                              )}
                            </div>
                          );
                        })}

                        {/* Playhead */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none transition-all duration-75"
                          style={{
                            left: `${(currentBeat / totalBeats) * 100}%`,
                            boxShadow: '0 0 10px hsl(var(--primary))',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              ))}
            </div>
          </div>
        </div>

        {/* Effects Panel */}
        <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <EffectsPanel effects={effects} onEffectsChange={setEffects} />
        </div>

        {/* Tips */}
        <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground py-4 animate-fade-in">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Click</kbd>
            Добавить/удалить ноту
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Space</kbd>
            Play/Pause
          </span>
        </div>
      </main>
    </div>
  );
};

// Helper function to convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export default Creator;
