import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioEffects {
  delay: { enabled: boolean; time: number; feedback: number; mix: number };
  reverb: { enabled: boolean; size: number; decay: number; mix: number };
  filter: { enabled: boolean; cutoff: number; resonance: number };
  distortion: { enabled: boolean; drive: number; tone: number; mix: number };
}

interface UseAudioEngineOptions {
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onDurationChange?: (duration: number) => void;
}

export const useAudioEngine = (options: UseAudioEngineOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const distortionNodeRef = useRef<WaveShaperNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const [effects, setEffects] = useState<AudioEffects>({
    delay: { enabled: false, time: 350, feedback: 40, mix: 30 },
    reverb: { enabled: false, size: 60, decay: 45, mix: 35 },
    filter: { enabled: false, cutoff: 8000, resonance: 20 },
    distortion: { enabled: false, drive: 30, tone: 50, mix: 50 },
  });

  // Initialize audio context
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      
      // Create delay node
      delayNodeRef.current = audioContextRef.current.createDelay(1);
      delayNodeRef.current.delayTime.value = effects.delay.time / 1000;
      
      // Create filter node
      filterNodeRef.current = audioContextRef.current.createBiquadFilter();
      filterNodeRef.current.type = 'lowpass';
      filterNodeRef.current.frequency.value = effects.filter.cutoff;
      filterNodeRef.current.Q.value = effects.filter.resonance / 10;
      
      // Create distortion node
      distortionNodeRef.current = audioContextRef.current.createWaveShaper();
      
      // Connect nodes: gain -> filter -> delay -> distortion -> destination
      gainNodeRef.current.connect(filterNodeRef.current);
      filterNodeRef.current.connect(delayNodeRef.current);
      delayNodeRef.current.connect(distortionNodeRef.current);
      distortionNodeRef.current.connect(audioContextRef.current.destination);
    }
    return audioContextRef.current;
  }, [effects]);

  // Update effect nodes
  useEffect(() => {
    if (delayNodeRef.current) {
      delayNodeRef.current.delayTime.value = effects.delay.enabled ? effects.delay.time / 1000 : 0;
    }
    if (filterNodeRef.current) {
      filterNodeRef.current.frequency.value = effects.filter.enabled ? effects.filter.cutoff : 20000;
      filterNodeRef.current.Q.value = effects.filter.enabled ? effects.filter.resonance / 10 : 0;
    }
  }, [effects]);

  // Update volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Time update loop
  const updateTime = useCallback(() => {
    if (audioContextRef.current && isPlaying && audioBufferRef.current) {
      const elapsed = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
      const newTime = Math.min(elapsed, audioBufferRef.current.duration);
      setCurrentTime(newTime);
      options.onTimeUpdate?.(newTime);
      
      if (newTime >= audioBufferRef.current.duration) {
        setIsPlaying(false);
        setCurrentTime(0);
        pauseTimeRef.current = 0;
        options.onEnded?.();
      } else {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    }
  }, [isPlaying, options]);

  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateTime]);

  // Load audio file
  const loadFile = useCallback(async (file: File) => {
    const ctx = initAudioContext();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
      setDuration(audioBuffer.duration);
      setIsLoaded(true);
      options.onDurationChange?.(audioBuffer.duration);
      return audioBuffer;
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }, [initAudioContext, options]);

  // Play audio
  const play = useCallback(() => {
    if (!audioBufferRef.current || !audioContextRef.current || !gainNodeRef.current) return;
    
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Stop any existing source
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }
    
    // Create new source
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(gainNodeRef.current);
    
    sourceNodeRef.current = source;
    startTimeRef.current = audioContextRef.current.currentTime;
    
    source.start(0, pauseTimeRef.current);
    setIsPlaying(true);
  }, []);

  // Pause audio
  const pause = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current) {
      pauseTimeRef.current = audioContextRef.current.currentTime - startTimeRef.current + pauseTimeRef.current;
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Stop audio
  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    pauseTimeRef.current = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  // Seek to time
  const seek = useCallback((time: number) => {
    const wasPlaying = isPlaying;
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    pauseTimeRef.current = Math.max(0, Math.min(time, duration));
    setCurrentTime(pauseTimeRef.current);
    
    if (wasPlaying) {
      play();
    }
  }, [isPlaying, duration, play]);

  // Export audio
  const exportAudio = useCallback(async (format: 'wav' | 'mp3' = 'wav'): Promise<Blob | null> => {
    if (!audioBufferRef.current) return null;
    
    const offlineCtx = new OfflineAudioContext(
      audioBufferRef.current.numberOfChannels,
      audioBufferRef.current.length,
      audioBufferRef.current.sampleRate
    );
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBufferRef.current;
    
    // Apply effects chain in offline context
    const gain = offlineCtx.createGain();
    gain.gain.value = volume / 100;
    
    source.connect(gain);
    gain.connect(offlineCtx.destination);
    
    source.start();
    
    const renderedBuffer = await offlineCtx.startRendering();
    
    // Convert to WAV
    const wavBlob = audioBufferToWav(renderedBuffer);
    return wavBlob;
  }, [volume]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    isLoaded,
    currentTime,
    duration,
    volume,
    isMuted,
    effects,
    loadFile,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setIsMuted,
    setEffects,
    exportAudio,
  };
};

// Helper function to convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
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
  
  // Audio data
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

export default useAudioEngine;
