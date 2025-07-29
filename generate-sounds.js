#!/usr/bin/env node

/**
 * Generates all Ghost Invaders sound effects as .wav files
 * Run: node generate-sounds.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create output directory
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * WAV file header creator
 */
function createWavHeader(dataLength, sampleRate = 44100, channels = 1, bitsPerSample = 16) {
  const buffer = Buffer.alloc(44);
  
  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  
  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // audio format (1 = PCM)
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // byte rate
  buffer.writeUInt16LE(channels * bitsPerSample / 8, 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);
  
  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  
  return buffer;
}

/**
 * Convert float samples (-1 to 1) to 16-bit PCM
 */
function floatTo16BitPCM(samples) {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s * 32767), i * 2);
  }
  return buffer;
}

/**
 * Save samples as WAV file
 */
function saveWav(filename, samples, sampleRate = 44100) {
  const pcmData = floatTo16BitPCM(samples);
  const header = createWavHeader(pcmData.length, sampleRate);
  const wav = Buffer.concat([header, pcmData]);
  
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, wav);
  console.log(`Generated: ${filename}`);
}

/**
 * Generate white noise
 */
function generateNoise(duration, sampleRate = 44100) {
  const samples = new Float32Array(Math.floor(duration * sampleRate));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.random() * 2 - 1;
  }
  return samples;
}

/**
 * Apply envelope to samples
 */
function applyEnvelope(samples, attack, decay, sustain, release, sampleRate = 44100) {
  const attackSamples = Math.floor(attack * sampleRate);
  const decaySamples = Math.floor(decay * sampleRate);
  const releaseSamples = Math.floor(release * sampleRate);
  const sustainSamples = samples.length - attackSamples - decaySamples - releaseSamples;
  
  for (let i = 0; i < samples.length; i++) {
    let gain = 0;
    
    if (i < attackSamples) {
      // Attack phase
      gain = i / attackSamples;
    } else if (i < attackSamples + decaySamples) {
      // Decay phase
      const decayProgress = (i - attackSamples) / decaySamples;
      gain = 1 - (decayProgress * (1 - sustain));
    } else if (i < attackSamples + decaySamples + sustainSamples) {
      // Sustain phase
      gain = sustain;
    } else {
      // Release phase
      const releaseProgress = (i - attackSamples - decaySamples - sustainSamples) / releaseSamples;
      gain = sustain * (1 - releaseProgress);
    }
    
    samples[i] *= gain;
  }
  
  return samples;
}

/**
 * Generate sine wave
 */
function generateSine(frequency, duration, sampleRate = 44100) {
  const samples = new Float32Array(Math.floor(duration * sampleRate));
  const angularFreq = 2 * Math.PI * frequency / sampleRate;
  
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin(angularFreq * i);
  }
  
  return samples;
}

/**
 * Generate square wave
 */
function generateSquare(frequency, duration, sampleRate = 44100) {
  const samples = new Float32Array(Math.floor(duration * sampleRate));
  const period = sampleRate / frequency;
  
  for (let i = 0; i < samples.length; i++) {
    samples[i] = (i % period) < (period / 2) ? 1 : -1;
  }
  
  return samples;
}

/**
 * Generate sawtooth wave
 */
function generateSawtooth(frequency, duration, sampleRate = 44100) {
  const samples = new Float32Array(Math.floor(duration * sampleRate));
  const period = sampleRate / frequency;
  
  for (let i = 0; i < samples.length; i++) {
    const phase = (i % period) / period;
    samples[i] = 2 * phase - 1;
  }
  
  return samples;
}

/**
 * Apply frequency sweep
 */
function applySweep(startFreq, endFreq, duration, type = 'sine', sampleRate = 44100) {
  const samples = new Float32Array(Math.floor(duration * sampleRate));
  
  for (let i = 0; i < samples.length; i++) {
    const progress = i / samples.length;
    const frequency = startFreq * Math.pow(endFreq / startFreq, progress);
    const phase = 2 * Math.PI * frequency / sampleRate;
    
    if (type === 'sine') {
      samples[i] = Math.sin(phase * i);
    } else if (type === 'square') {
      samples[i] = Math.sin(phase * i) > 0 ? 1 : -1;
    } else if (type === 'sawtooth') {
      const period = sampleRate / frequency;
      const phasePos = (i % period) / period;
      samples[i] = 2 * phasePos - 1;
    }
  }
  
  return samples;
}

/**
 * Simple low-pass filter
 */
function lowPassFilter(samples, cutoffFreq, sampleRate = 44100) {
  const rc = 1 / (2 * Math.PI * cutoffFreq);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  
  const filtered = new Float32Array(samples.length);
  filtered[0] = samples[0];
  
  for (let i = 1; i < samples.length; i++) {
    filtered[i] = filtered[i - 1] + alpha * (samples[i] - filtered[i - 1]);
  }
  
  return filtered;
}

/**
 * Mix multiple audio signals
 */
function mixSignals(...signals) {
  const maxLength = Math.max(...signals.map(s => s.length));
  const mixed = new Float32Array(maxLength);
  
  for (let i = 0; i < maxLength; i++) {
    let sum = 0;
    let count = 0;
    
    for (const signal of signals) {
      if (i < signal.length) {
        sum += signal[i];
        count++;
      }
    }
    
    mixed[i] = count > 0 ? sum / count : 0;
  }
  
  return mixed;
}

// ========== GENERATE SOUNDS ==========

console.log('Generating Ghost Invaders sound effects...\n');

// 1. Player Shoot
(() => {
  const sweep = applySweep(2000, 800, 0.25, 'sawtooth');
  const noise = generateNoise(0.05);
  const filteredNoise = lowPassFilter(noise, 3000);
  
  const envelope = applyEnvelope(sweep, 0.002, 0.05, 0.3, 0.2);
  const noiseEnvelope = applyEnvelope(filteredNoise, 0.001, 0.049, 0, 0);
  
  const mixed = mixSignals(
    envelope.map(s => s * 0.7),
    noiseEnvelope.map(s => s * 0.3)
  );
  
  saveWav('player_shoot.wav', mixed);
})();

// 2. Ghost Spawn
(() => {
  const noise = generateNoise(0.5);
  const filtered = lowPassFilter(noise, 1000);
  const envelope = applyEnvelope(filtered, 0.1, 0.1, 0.5, 0.3);
  
  const sine = generateSine(130, 0.5);
  const sineEnvelope = applyEnvelope(sine, 0.1, 0.2, 0.3, 0.2);
  
  const mixed = mixSignals(
    envelope.map(s => s * 0.4),
    sineEnvelope.map(s => s * 0.2)
  );
  
  saveWav('ghost_spawn.wav', mixed);
})();

// 3. Ghost Hit
(() => {
  const thud = generateSine(80, 0.2);
  const thudEnvelope = applyEnvelope(thud, 0.001, 0.05, 0.3, 0.15);
  
  const click = generateNoise(0.01);
  const clickEnvelope = applyEnvelope(click, 0.001, 0.009, 0, 0);
  
  const mixed = mixSignals(
    thudEnvelope.map(s => s * 0.5),
    clickEnvelope.map(s => s * 0.3)
  );
  
  saveWav('ghost_hit.wav', mixed);
})();

// 4. Ghost Destroyed
(() => {
  const pop = generateNoise(0.05);
  const popEnvelope = applyEnvelope(pop, 0.001, 0.049, 0, 0);
  
  const sweep = applySweep(523, 131, 0.6, 'sawtooth');
  const sweepEnvelope = applyEnvelope(sweep, 0.01, 0.1, 0.3, 0.5);
  
  const mixed = mixSignals(
    popEnvelope.map(s => s * 0.4),
    sweepEnvelope.map(s => s * 0.3)
  );
  
  saveWav('ghost_destroyed.wav', mixed);
})();

// 5. Explosion
(() => {
  const boom = generateSine(60, 0.5);
  const boomEnvelope = applyEnvelope(boom, 0.001, 0.1, 0.4, 0.4);
  
  const noise = generateNoise(0.5);
  const filtered = lowPassFilter(noise, 2000);
  const noiseEnvelope = applyEnvelope(filtered, 0.001, 0.2, 0.3, 0.3);
  
  const mixed = mixSignals(
    boomEnvelope.map(s => s * 0.5),
    noiseEnvelope.map(s => s * 0.3)
  );
  
  saveWav('explosion.wav', mixed);
})();

// 6. Nuke Ready
(() => {
  const sweep = applySweep(100, 2000, 2, 'sine');
  const envelope = applyEnvelope(sweep, 0.5, 0.5, 0.8, 0.5);
  
  // Add pulsing effect
  for (let i = 0; i < envelope.length; i++) {
    const pulse = Math.sin(2 * Math.PI * 8 * i / 44100);
    envelope[i] *= 0.5 + 0.5 * pulse;
  }
  
  saveWav('nuke_ready.wav', envelope);
})();

// 7. Nuke Fire
(() => {
  const sub = generateSine(40, 2.5);
  const subEnvelope = applyEnvelope(sub, 0.001, 0.2, 0.6, 2.3);
  
  const noise = generateNoise(2.5);
  const filtered = lowPassFilter(noise, 4000);
  const noiseEnvelope = applyEnvelope(filtered, 0.001, 0.5, 0.4, 2);
  
  const mixed = mixSignals(
    subEnvelope.map(s => s * 0.6),
    noiseEnvelope.map(s => s * 0.4)
  );
  
  saveWav('nuke_fire.wav', mixed);
})();

// 8. Extra Life
(() => {
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
  const duration = 0.2;
  const totalDuration = notes.length * 0.1 + duration;
  const samples = new Float32Array(Math.floor(totalDuration * 44100));
  
  notes.forEach((freq, i) => {
    const start = Math.floor(i * 0.1 * 44100);
    const noteSamples = generateSquare(freq, duration);
    const envelope = applyEnvelope(noteSamples, 0.01, 0.05, 0.7, 0.14);
    
    for (let j = 0; j < envelope.length && start + j < samples.length; j++) {
      samples[start + j] += envelope[j] * 0.3;
    }
  });
  
  saveWav('extra_life.wav', samples);
})();

// 9. Life Lost
(() => {
  const sweep = applySweep(1000, 200, 1, 'sine');
  const envelope = applyEnvelope(sweep, 0.01, 0.1, 0.8, 0.9);
  
  // Add vibrato
  for (let i = 0; i < envelope.length; i++) {
    const vibrato = Math.sin(2 * Math.PI * 10 * i / 44100);
    envelope[i] *= 1 + 0.1 * vibrato;
  }
  
  saveWav('life_lost.wav', envelope.map(s => s * 0.3));
})();

// 10. Game Over
(() => {
  // Organ chord
  const notes = [110, 130.81, 164.81, 246.94];
  const duration = 3;
  const samples = new Float32Array(Math.floor(duration * 44100));
  
  notes.forEach(freq => {
    const tone = generateSawtooth(freq, duration);
    const envelope = applyEnvelope(tone, 0.5, 0.5, 0.7, 2);
    
    for (let i = 0; i < samples.length; i++) {
      samples[i] += envelope[i] * 0.2;
    }
  });
  
  // Apply pitch drop
  const pitched = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const pitchFactor = 1 - (i / samples.length) * 0.5;
    const sourceIndex = Math.floor(i / pitchFactor);
    if (sourceIndex < samples.length) {
      pitched[i] = samples[sourceIndex];
    }
  }
  
  const filtered = lowPassFilter(pitched, 2000);
  saveWav('game_over.wav', filtered);
})();

// 11. Pause
(() => {
  const click = generateSine(1000, 0.05);
  const envelope = applyEnvelope(click, 0.001, 0.01, 0.5, 0.039);
  saveWav('pause.wav', envelope.map(s => s * 0.2));
})();

// 12. Special Ghost Spawn (chime)
(() => {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  const samples = new Float32Array(Math.floor(1 * 44100));
  
  notes.forEach((freq, i) => {
    const start = Math.floor(i * 0.1 * 44100);
    const tone = generateSine(freq, 0.8);
    const envelope = applyEnvelope(tone, 0.01, 0.1, 0.5, 0.69);
    
    for (let j = 0; j < envelope.length && start + j < samples.length; j++) {
      samples[start + j] += envelope[j] * 0.2;
    }
  });
  
  saveWav('special_ghost_spawn.wav', samples);
})();

// 13. Rainbow Ghost Spawn
(() => {
  const baseFreq = 2000;
  const sparkles = new Float32Array(Math.floor(1.2 * 44100));
  
  for (let i = 0; i < 12; i++) {
    const freq = baseFreq + i * 200;
    const start = Math.floor(i * 0.05 * 44100);
    const duration = 0.3;
    const tone = generateSine(freq, duration);
    const envelope = applyEnvelope(tone, 0.01, 0.05, 0.3, 0.24);
    
    for (let j = 0; j < envelope.length && start + j < sparkles.length; j++) {
      sparkles[start + j] += envelope[j] * 0.15;
    }
  }
  
  saveWav('rainbow_ghost_spawn.wav', sparkles);
})();

// 14. Boss Ghost Spawn
(() => {
  const horn1 = generateSawtooth(87.31, 3);
  const horn2 = generateSawtooth(87.31 * 1.01, 3);
  const horn3 = generateSawtooth(87.31 * 0.99, 3);
  
  const mixed = mixSignals(horn1, horn2, horn3);
  const filtered = lowPassFilter(mixed, 800);
  const envelope = applyEnvelope(filtered, 1, 0.5, 0.7, 1.5);
  
  saveWav('boss_ghost_spawn.wav', envelope.map(s => s * 0.4));
})();

// 15. Rainbow Explosion
(() => {
  const duration = 1.5;
  const samples = new Float32Array(Math.floor(duration * 44100));
  
  // Crystal breaking
  for (let i = 0; i < 6; i++) {
    const freq = 2000 + i * 1000 + Math.random() * 500;
    const start = Math.floor(i * 0.05 * 44100);
    const burst = generateSine(freq, 0.5);
    const envelope = applyEnvelope(burst, 0.001, 0.05, 0.3, 0.449);
    
    for (let j = 0; j < envelope.length && start + j < samples.length; j++) {
      samples[start + j] += envelope[j] * 0.2;
    }
  }
  
  // Add sparkle noise
  const noise = generateNoise(1.5);
  const filtered = lowPassFilter(noise, 8000);
  const noiseEnvelope = applyEnvelope(filtered, 0.1, 0.3, 0.4, 0.7);
  
  const mixed = mixSignals(samples, noiseEnvelope.map(s => s * 0.1));
  saveWav('rainbow_explosion.wav', mixed);
})();

// 16. Boss Explosion with Reverberation (Kid-Friendly Low Bass)
(() => {
  const duration = 5; // Extended for reverb tail
  const samples = new Float32Array(Math.floor(duration * 44100));
  const sampleRate = 44100;
  
  // Initial massive explosion - LOW FREQUENCIES ONLY
  const mainExplosion = (() => {
    // Deep sub-bass impact (lower frequency, softer)
    const sub = generateSine(40, 1.5);
    const subEnvelope = applyEnvelope(sub, 0.01, 0.3, 0.6, 1.2);
    
    // Main explosion noise - HEAVILY filtered to remove high frequencies
    const noise = generateNoise(2);
    const filtered1 = lowPassFilter(noise, 800);  // First pass at 800Hz
    const filtered2 = lowPassFilter(filtered1, 400); // Second pass at 400Hz
    const noiseEnvelope = applyEnvelope(filtered2, 0.01, 0.4, 0.5, 1.6);
    
    // Low frequency sine waves instead of harsh sawtooth
    const low1 = generateSine(55, 2);     // A1
    const low2 = generateSine(82.41, 2);  // E2
    const lowEnvelope1 = applyEnvelope(low1, 0.01, 0.2, 0.5, 1.8);
    const lowEnvelope2 = applyEnvelope(low2, 0.05, 0.25, 0.4, 1.75);
    
    return mixSignals(
      subEnvelope.map(s => s * 0.4),
      noiseEnvelope.map(s => s * 0.3),
      lowEnvelope1.map(s => s * 0.2),
      lowEnvelope2.map(s => s * 0.1)
    );
  })();
  
  // Copy main explosion to samples
  for (let i = 0; i < mainExplosion.length && i < samples.length; i++) {
    samples[i] = mainExplosion[i];
  }
  
  // Create reverb using multiple delays
  const delayTimes = [0.023, 0.037, 0.041, 0.053, 0.061, 0.073, 0.089, 0.101];
  const delayDecays = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55];
  
  // Apply each delay line
  delayTimes.forEach((delayTime, index) => {
    const delaySamples = Math.floor(delayTime * sampleRate);
    const decay = delayDecays[index];
    
    for (let i = delaySamples; i < samples.length; i++) {
      samples[i] += samples[i - delaySamples] * decay;
    }
  });
  
  // Add echo explosions at different distances (LOW FREQUENCY ONLY)
  const echoTimes = [0.3, 0.6, 1.0, 1.5, 2.2];
  const echoDecays = [0.6, 0.4, 0.3, 0.2, 0.1];
  
  echoTimes.forEach((echoTime, index) => {
    const echoStart = Math.floor(echoTime * sampleRate);
    const echoDecay = echoDecays[index];
    
    // Create smaller explosion for echo - SUPER LOW PASS
    const echoNoise = generateNoise(0.5);
    const echoFiltered1 = lowPassFilter(echoNoise, 300 - (index * 40)); // Max 300Hz
    const echoFiltered2 = lowPassFilter(echoFiltered1, 200); // Extra filtering
    const echoEnvelope = applyEnvelope(echoFiltered2, 0.01, 0.15, 0.2, 0.35);
    
    // Use only low frequency booms
    const echoFreq = 55 * Math.pow(0.9, index); // Start at A1, go lower
    const echoBoom = generateSine(echoFreq, 0.6);
    const echoBoomEnvelope = applyEnvelope(echoBoom, 0.01, 0.1, 0.3, 0.5);
    
    const echoMixed = mixSignals(
      echoEnvelope.map(s => s * 0.3),
      echoBoomEnvelope.map(s => s * 0.7)
    );
    
    // Place echo in the output
    for (let j = 0; j < echoMixed.length && echoStart + j < samples.length; j++) {
      samples[echoStart + j] += echoMixed[j] * echoDecay;
    }
  });
  
  // Apply gentler low-pass filter to keep it mellow
  const filtered = lowPassFilter(samples, 350); // Hard cutoff at 350Hz
  
  // Add very deep rumble (sub-bass only)
  const rumble = generateNoise(duration);
  const rumbleFiltered1 = lowPassFilter(rumble, 80);
  const rumbleFiltered2 = lowPassFilter(rumbleFiltered1, 60); // Extra smooth
  const rumbleEnvelope = applyEnvelope(rumbleFiltered2, 0.5, 1.5, 0.3, 3);
  
  // Add a deep "whoosh" using filtered noise
  const whoosh = generateNoise(duration);
  const whooshFiltered = lowPassFilter(whoosh, 150);
  const whooshEnvelope = applyEnvelope(whooshFiltered, 0.2, 0.8, 0.4, 4);
  
  const finalMix = mixSignals(
    filtered.map(s => s * 0.5),
    rumbleEnvelope.map(s => s * 0.3),
    whooshEnvelope.map(s => s * 0.2)
  );
  
  // Gentle normalization to keep it soft
  let maxVal = 0;
  for (let i = 0; i < finalMix.length; i++) {
    maxVal = Math.max(maxVal, Math.abs(finalMix[i]));
  }
  if (maxVal > 0.7) {
    for (let i = 0; i < finalMix.length; i++) {
      finalMix[i] *= 0.7 / maxVal;
    }
  }
  
  saveWav('boss_explosion.wav', finalMix);
})();

console.log('\n✅ All sound effects generated successfully!');
console.log(`Files saved to: ${outputDir}`);
console.log('\nYou can now use these .wav files in your game.');