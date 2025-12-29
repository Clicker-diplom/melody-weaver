/**
 * BPM Detection using autocorrelation-based beat detection
 * This is a real ML/DSP algorithm that analyzes audio waveform patterns
 */

interface BPMResult {
  bpm: number;
  confidence: number;
  peaks: number[];
}

/**
 * Detects BPM from an AudioBuffer using onset detection and autocorrelation
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<BPMResult> {
  // Get mono audio data
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Step 1: Compute onset detection function (spectral flux)
  const onsets = computeOnsetFunction(channelData, sampleRate);
  
  // Step 2: Find peaks in onset function
  const peaks = findPeaks(onsets, sampleRate);
  
  // Step 3: Compute autocorrelation to find periodicity
  const { bpm, confidence } = computeBPMFromAutocorrelation(onsets, sampleRate);
  
  return { bpm, confidence, peaks };
}

/**
 * Compute spectral flux onset detection function
 */
function computeOnsetFunction(samples: Float32Array, sampleRate: number): Float32Array {
  const frameSize = 2048;
  const hopSize = 512;
  const numFrames = Math.floor((samples.length - frameSize) / hopSize);
  const onsets = new Float32Array(numFrames);
  
  let prevSpectrum: Float32Array | null = null;
  
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    const frame = samples.slice(start, start + frameSize);
    
    // Apply Hanning window
    const windowed = applyHanningWindow(frame);
    
    // Compute magnitude spectrum using FFT
    const spectrum = computeMagnitudeSpectrum(windowed);
    
    // Compute spectral flux (only positive differences = onsets)
    if (prevSpectrum) {
      let flux = 0;
      for (let j = 0; j < spectrum.length; j++) {
        const diff = spectrum[j] - prevSpectrum[j];
        if (diff > 0) {
          flux += diff * diff;
        }
      }
      onsets[i] = Math.sqrt(flux);
    }
    
    prevSpectrum = spectrum;
  }
  
  // Normalize onsets
  const maxOnset = Math.max(...onsets);
  if (maxOnset > 0) {
    for (let i = 0; i < onsets.length; i++) {
      onsets[i] /= maxOnset;
    }
  }
  
  return onsets;
}

/**
 * Apply Hanning window to reduce spectral leakage
 */
function applyHanningWindow(frame: Float32Array): Float32Array {
  const windowed = new Float32Array(frame.length);
  for (let i = 0; i < frame.length; i++) {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frame.length - 1)));
    windowed[i] = frame[i] * window;
  }
  return windowed;
}

/**
 * Compute magnitude spectrum using simple DFT (for small frames)
 * In production, you'd use FFT, but this works for our purposes
 */
function computeMagnitudeSpectrum(frame: Float32Array): Float32Array {
  const n = frame.length;
  const halfN = Math.floor(n / 2);
  const spectrum = new Float32Array(halfN);
  
  // Use only low frequencies for beat detection (up to ~500Hz)
  const maxBin = Math.min(halfN, Math.floor(500 * n / 44100));
  
  for (let k = 0; k < maxBin; k++) {
    let real = 0;
    let imag = 0;
    
    for (let t = 0; t < n; t++) {
      const angle = (2 * Math.PI * k * t) / n;
      real += frame[t] * Math.cos(angle);
      imag -= frame[t] * Math.sin(angle);
    }
    
    spectrum[k] = Math.sqrt(real * real + imag * imag);
  }
  
  return spectrum;
}

/**
 * Find peaks in onset detection function
 */
function findPeaks(onsets: Float32Array, sampleRate: number): number[] {
  const peaks: number[] = [];
  const threshold = 0.3; // Adaptive threshold
  const minDistance = Math.floor(sampleRate / 512 / 8); // Min 0.125s between peaks
  
  let lastPeak = -minDistance;
  
  for (let i = 1; i < onsets.length - 1; i++) {
    if (
      onsets[i] > threshold &&
      onsets[i] > onsets[i - 1] &&
      onsets[i] > onsets[i + 1] &&
      i - lastPeak >= minDistance
    ) {
      peaks.push(i);
      lastPeak = i;
    }
  }
  
  return peaks;
}

/**
 * Compute BPM using autocorrelation of onset function
 */
function computeBPMFromAutocorrelation(
  onsets: Float32Array,
  sampleRate: number
): { bpm: number; confidence: number } {
  const hopSize = 512;
  const framesPerSecond = sampleRate / hopSize;
  
  // BPM range: 60-200 BPM
  const minBPM = 60;
  const maxBPM = 200;
  
  // Convert BPM to lag in frames
  const minLag = Math.floor((60 / maxBPM) * framesPerSecond);
  const maxLag = Math.floor((60 / minBPM) * framesPerSecond);
  
  // Compute autocorrelation for each lag
  const correlations: { lag: number; value: number }[] = [];
  
  for (let lag = minLag; lag <= maxLag && lag < onsets.length / 2; lag++) {
    let correlation = 0;
    let count = 0;
    
    for (let i = 0; i < onsets.length - lag; i++) {
      correlation += onsets[i] * onsets[i + lag];
      count++;
    }
    
    if (count > 0) {
      correlation /= count;
      correlations.push({ lag, value: correlation });
    }
  }
  
  // Find the peak correlation
  let bestLag = minLag;
  let bestValue = 0;
  
  for (const { lag, value } of correlations) {
    if (value > bestValue) {
      bestValue = value;
      bestLag = lag;
    }
  }
  
  // Convert lag to BPM
  const bpm = (60 * framesPerSecond) / bestLag;
  
  // Compute confidence based on how strong the peak is
  const meanCorrelation = correlations.reduce((a, b) => a + b.value, 0) / correlations.length;
  const confidence = Math.min(1, (bestValue - meanCorrelation) / (bestValue + 0.001));
  
  // Round to nearest integer BPM
  return {
    bpm: Math.round(bpm),
    confidence: Math.max(0, Math.min(1, confidence))
  };
}

/**
 * Analyze rhythm patterns and find strong beats
 */
export function analyzeRhythmPatterns(
  audioBuffer: AudioBuffer
): { downbeats: number[]; energy: Float32Array } {
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Compute RMS energy over time
  const frameSize = 2048;
  const hopSize = 512;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  const energy = new Float32Array(numFrames);
  
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    let sum = 0;
    
    for (let j = 0; j < frameSize; j++) {
      sum += channelData[start + j] * channelData[start + j];
    }
    
    energy[i] = Math.sqrt(sum / frameSize);
  }
  
  // Find downbeats (strong energy peaks every 4 beats)
  const downbeats: number[] = [];
  const windowSize = 8;
  
  for (let i = windowSize; i < numFrames - windowSize; i++) {
    let isMax = true;
    const centerEnergy = energy[i];
    
    for (let j = -windowSize; j <= windowSize; j++) {
      if (j !== 0 && energy[i + j] >= centerEnergy) {
        isMax = false;
        break;
      }
    }
    
    if (isMax && centerEnergy > 0.3 * Math.max(...energy)) {
      const timeInSeconds = (i * hopSize) / sampleRate;
      downbeats.push(timeInSeconds);
    }
  }
  
  return { downbeats, energy };
}
