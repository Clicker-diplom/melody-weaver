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
  onWaveformUpdate?: (waveform: number[]) => void;
}

interface AudioRegion {
  start: number;
  end: number;
}

export const useAudioEngine = (options: UseAudioEngineOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const originalBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayGainRef = useRef<GainNode | null>(null);
  const delayFeedbackRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const distortionNodeRef = useRef<WaveShaperNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const historyRef = useRef<AudioBuffer[]>([]);
  const historyIndexRef = useRef(-1);

  const [effects, setEffects] = useState<AudioEffects>({
    delay: { enabled: false, time: 350, feedback: 40, mix: 30 },
    reverb: { enabled: false, size: 60, decay: 45, mix: 35 },
    filter: { enabled: false, cutoff: 8000, resonance: 20 },
    distortion: { enabled: false, drive: 30, tone: 50, mix: 50 },
  });

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

  // Initialize audio context and effect nodes
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      const ctx = audioContextRef.current;
      
      // Create all nodes
      masterGainRef.current = ctx.createGain();
      gainNodeRef.current = ctx.createGain();
      dryGainRef.current = ctx.createGain();
      
      // Delay chain
      delayNodeRef.current = ctx.createDelay(2);
      delayGainRef.current = ctx.createGain();
      delayFeedbackRef.current = ctx.createGain();
      
      // Filter
      filterNodeRef.current = ctx.createBiquadFilter();
      filterNodeRef.current.type = 'lowpass';
      
      // Distortion
      distortionNodeRef.current = ctx.createWaveShaper();
      distortionNodeRef.current.oversample = '4x';
      
      // Reverb
      convolverNodeRef.current = ctx.createConvolver();
      reverbGainRef.current = ctx.createGain();
      
      // Create initial reverb impulse
      convolverNodeRef.current.buffer = createReverbImpulse(ctx, 2, 2);
      
      // Connect effect chain:
      // source -> gain -> filter -> distortion -> dry/delay/reverb -> master -> destination
      gainNodeRef.current.connect(filterNodeRef.current);
      filterNodeRef.current.connect(distortionNodeRef.current);
      
      // Dry signal
      distortionNodeRef.current.connect(dryGainRef.current);
      dryGainRef.current.connect(masterGainRef.current);
      
      // Delay path
      distortionNodeRef.current.connect(delayNodeRef.current);
      delayNodeRef.current.connect(delayGainRef.current);
      delayGainRef.current.connect(masterGainRef.current);
      delayNodeRef.current.connect(delayFeedbackRef.current);
      delayFeedbackRef.current.connect(delayNodeRef.current);
      
      // Reverb path
      distortionNodeRef.current.connect(convolverNodeRef.current);
      convolverNodeRef.current.connect(reverbGainRef.current);
      reverbGainRef.current.connect(masterGainRef.current);
      
      masterGainRef.current.connect(ctx.destination);
    }
    return audioContextRef.current;
  }, [createReverbImpulse]);

  // Update effect parameters
  useEffect(() => {
    if (delayNodeRef.current && delayGainRef.current && delayFeedbackRef.current) {
      delayNodeRef.current.delayTime.value = effects.delay.time / 1000;
      delayGainRef.current.gain.value = effects.delay.enabled ? effects.delay.mix / 100 : 0;
      delayFeedbackRef.current.gain.value = effects.delay.enabled ? effects.delay.feedback / 100 : 0;
    }
    
    if (filterNodeRef.current) {
      filterNodeRef.current.frequency.value = effects.filter.enabled ? effects.filter.cutoff : 20000;
      filterNodeRef.current.Q.value = effects.filter.enabled ? effects.filter.resonance / 5 : 0.5;
    }
    
    if (distortionNodeRef.current) {
      if (effects.distortion.enabled) {
        distortionNodeRef.current.curve = makeDistortionCurve(effects.distortion.drive * 2);
      } else {
        distortionNodeRef.current.curve = null;
      }
    }
    
    if (reverbGainRef.current) {
      reverbGainRef.current.gain.value = effects.reverb.enabled ? effects.reverb.mix / 100 : 0;
    }
    
    if (dryGainRef.current) {
      const wetMix = (
        (effects.delay.enabled ? effects.delay.mix / 100 : 0) +
        (effects.reverb.enabled ? effects.reverb.mix / 100 : 0)
      ) / 2;
      dryGainRef.current.gain.value = 1 - wetMix * 0.5;
    }
    
    // Update reverb impulse when size/decay changes
    if (audioContextRef.current && convolverNodeRef.current && effects.reverb.enabled) {
      const size = effects.reverb.size / 30;
      const decay = effects.reverb.decay / 20;
      convolverNodeRef.current.buffer = createReverbImpulse(audioContextRef.current, size, decay);
    }
  }, [effects, makeDistortionCurve, createReverbImpulse]);

  // Update volume
  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // Generate waveform data from AudioBuffer
  const generateWaveform = useCallback((buffer: AudioBuffer, samples: number = 200) => {
    const channelData = buffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / samples);
    const waveform: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      let sum = 0;
      const start = i * blockSize;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(channelData[start + j] || 0);
      }
      waveform.push(sum / blockSize);
    }
    
    // Normalize
    const max = Math.max(...waveform, 0.01);
    return waveform.map(v => v / max);
  }, []);

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

  // Save to history for undo/redo
  const saveToHistory = useCallback(() => {
    if (!audioBufferRef.current) return;
    
    // Remove any redo states
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    
    // Clone current buffer
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const clone = ctx.createBuffer(
      audioBufferRef.current.numberOfChannels,
      audioBufferRef.current.length,
      audioBufferRef.current.sampleRate
    );
    for (let ch = 0; ch < audioBufferRef.current.numberOfChannels; ch++) {
      clone.copyToChannel(audioBufferRef.current.getChannelData(ch).slice(), ch);
    }
    
    historyRef.current.push(clone);
    historyIndexRef.current++;
    
    // Limit history size
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, []);

  // Load audio file
  const loadFile = useCallback(async (file: File) => {
    const ctx = initAudioContext();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
      originalBufferRef.current = audioBuffer;
      
      // Generate waveform
      const waveform = generateWaveform(audioBuffer);
      setWaveformData(waveform);
      options.onWaveformUpdate?.(waveform);
      
      setDuration(audioBuffer.duration);
      setIsLoaded(true);
      options.onDurationChange?.(audioBuffer.duration);
      
      // Clear history and save initial state
      historyRef.current = [];
      historyIndexRef.current = -1;
      saveToHistory();
      
      return audioBuffer;
    } catch (error) {
      console.error('Error loading audio file:', error);
      throw error;
    }
  }, [initAudioContext, options, generateWaveform, saveToHistory]);

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

  // ===== AUDIO PROCESSING FUNCTIONS =====

  // Cut region from audio
  const cutRegion = useCallback((region: AudioRegion) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    saveToHistory();
    const buffer = audioBufferRef.current;
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(region.start * sampleRate);
    const endSample = Math.floor(region.end * sampleRate);
    const newLength = buffer.length - (endSample - startSample);
    
    if (newLength <= 0) return;
    
    const newBuffer = audioContextRef.current.createBuffer(
      buffer.numberOfChannels,
      newLength,
      sampleRate
    );
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const oldData = buffer.getChannelData(ch);
      const newData = newBuffer.getChannelData(ch);
      
      // Copy data before cut region
      newData.set(oldData.subarray(0, startSample), 0);
      // Copy data after cut region
      newData.set(oldData.subarray(endSample), startSample);
    }
    
    audioBufferRef.current = newBuffer;
    setDuration(newBuffer.duration);
    setWaveformData(generateWaveform(newBuffer));
    options.onDurationChange?.(newBuffer.duration);
  }, [saveToHistory, generateWaveform, options]);

  // Delete region (replace with silence)
  const deleteRegion = useCallback((region: AudioRegion) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    saveToHistory();
    const buffer = audioBufferRef.current;
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(region.start * sampleRate);
    const endSample = Math.floor(region.end * sampleRate);
    
    const newBuffer = audioContextRef.current.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      sampleRate
    );
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const oldData = buffer.getChannelData(ch);
      const newData = newBuffer.getChannelData(ch);
      newData.set(oldData);
      
      // Silence the region
      for (let i = startSample; i < endSample && i < newData.length; i++) {
        newData[i] = 0;
      }
    }
    
    audioBufferRef.current = newBuffer;
    setWaveformData(generateWaveform(newBuffer));
  }, [saveToHistory, generateWaveform]);

  // Add silence at position
  const insertSilence = useCallback((position: number, duration: number) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    saveToHistory();
    const buffer = audioBufferRef.current;
    const sampleRate = buffer.sampleRate;
    const positionSample = Math.floor(position * sampleRate);
    const silenceSamples = Math.floor(duration * sampleRate);
    const newLength = buffer.length + silenceSamples;
    
    const newBuffer = audioContextRef.current.createBuffer(
      buffer.numberOfChannels,
      newLength,
      sampleRate
    );
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const oldData = buffer.getChannelData(ch);
      const newData = newBuffer.getChannelData(ch);
      
      // Copy data before position
      newData.set(oldData.subarray(0, positionSample), 0);
      // Silence is already 0
      // Copy data after position
      newData.set(oldData.subarray(positionSample), positionSample + silenceSamples);
    }
    
    audioBufferRef.current = newBuffer;
    setDuration(newBuffer.duration);
    setWaveformData(generateWaveform(newBuffer));
    options.onDurationChange?.(newBuffer.duration);
  }, [saveToHistory, generateWaveform, options]);

  // Normalize audio
  const normalize = useCallback(() => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    saveToHistory();
    const buffer = audioBufferRef.current;
    
    const newBuffer = audioContextRef.current.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    // Find peak
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        peak = Math.max(peak, Math.abs(data[i]));
      }
    }
    
    const gain = peak > 0 ? 0.99 / peak : 1;
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const oldData = buffer.getChannelData(ch);
      const newData = newBuffer.getChannelData(ch);
      for (let i = 0; i < oldData.length; i++) {
        newData[i] = oldData[i] * gain;
      }
    }
    
    audioBufferRef.current = newBuffer;
    setWaveformData(generateWaveform(newBuffer));
  }, [saveToHistory, generateWaveform]);

  // Fade In
  const fadeIn = useCallback((region: AudioRegion) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    saveToHistory();
    const buffer = audioBufferRef.current;
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(region.start * sampleRate);
    const endSample = Math.floor(region.end * sampleRate);
    const fadeSamples = endSample - startSample;
    
    const newBuffer = audioContextRef.current.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      sampleRate
    );
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const oldData = buffer.getChannelData(ch);
      const newData = newBuffer.getChannelData(ch);
      newData.set(oldData);
      
      for (let i = startSample; i < endSample && i < newData.length; i++) {
        const fadeProgress = (i - startSample) / fadeSamples;
        newData[i] *= fadeProgress;
      }
    }
    
    audioBufferRef.current = newBuffer;
    setWaveformData(generateWaveform(newBuffer));
  }, [saveToHistory, generateWaveform]);

  // Fade Out
  const fadeOut = useCallback((region: AudioRegion) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    
    saveToHistory();
    const buffer = audioBufferRef.current;
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(region.start * sampleRate);
    const endSample = Math.floor(region.end * sampleRate);
    const fadeSamples = endSample - startSample;
    
    const newBuffer = audioContextRef.current.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      sampleRate
    );
    
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const oldData = buffer.getChannelData(ch);
      const newData = newBuffer.getChannelData(ch);
      newData.set(oldData);
      
      for (let i = startSample; i < endSample && i < newData.length; i++) {
        const fadeProgress = 1 - (i - startSample) / fadeSamples;
        newData[i] *= fadeProgress;
      }
    }
    
    audioBufferRef.current = newBuffer;
    setWaveformData(generateWaveform(newBuffer));
  }, [saveToHistory, generateWaveform]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndexRef.current > 0 && audioContextRef.current) {
      historyIndexRef.current--;
      const buffer = historyRef.current[historyIndexRef.current];
      
      const newBuffer = audioContextRef.current.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
      );
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        newBuffer.copyToChannel(buffer.getChannelData(ch).slice(), ch);
      }
      
      audioBufferRef.current = newBuffer;
      setDuration(newBuffer.duration);
      setWaveformData(generateWaveform(newBuffer));
      options.onDurationChange?.(newBuffer.duration);
      return true;
    }
    return false;
  }, [generateWaveform, options]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1 && audioContextRef.current) {
      historyIndexRef.current++;
      const buffer = historyRef.current[historyIndexRef.current];
      
      const newBuffer = audioContextRef.current.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
      );
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        newBuffer.copyToChannel(buffer.getChannelData(ch).slice(), ch);
      }
      
      audioBufferRef.current = newBuffer;
      setDuration(newBuffer.duration);
      setWaveformData(generateWaveform(newBuffer));
      options.onDurationChange?.(newBuffer.duration);
      return true;
    }
    return false;
  }, [generateWaveform, options]);

  // Export audio with effects applied
  const exportAudio = useCallback(async (format: 'wav' | 'mp3' = 'wav'): Promise<Blob | null> => {
    if (!audioBufferRef.current) return null;
    
    const buffer = audioBufferRef.current;
    const offlineCtx = new OfflineAudioContext(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    const source = offlineCtx.createBufferSource();
    source.buffer = buffer;
    
    // Recreate effect chain in offline context
    const gain = offlineCtx.createGain();
    gain.gain.value = volume / 100;
    
    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = effects.filter.enabled ? effects.filter.cutoff : 20000;
    filter.Q.value = effects.filter.enabled ? effects.filter.resonance / 5 : 0.5;
    
    const distortion = offlineCtx.createWaveShaper();
    if (effects.distortion.enabled) {
      distortion.curve = makeDistortionCurve(effects.distortion.drive * 2);
    }
    distortion.oversample = '4x';
    
    // Connect chain
    source.connect(filter);
    filter.connect(distortion);
    distortion.connect(gain);
    gain.connect(offlineCtx.destination);
    
    source.start();
    
    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWav(renderedBuffer);
    return wavBlob;
  }, [volume, effects, makeDistortionCurve]);

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
    waveformData,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
    loadFile,
    play,
    pause,
    stop,
    seek,
    setVolume,
    setIsMuted,
    setEffects,
    exportAudio,
    // Editing functions
    cutRegion,
    deleteRegion,
    insertSilence,
    normalize,
    fadeIn,
    fadeOut,
    undo,
    redo,
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
