#!/usr/bin/env node

/**
 * Generates only the boss explosion sound with kid-friendly low bass
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

// GENERATE KID-FRIENDLY BOSS EXPLOSION
console.log('Generating kid-friendly boss explosion sound...\n');

const duration = 4; // Shorter duration
const samples = new Float32Array(Math.floor(duration * 44100));
const sampleRate = 44100;

// 1. Deep "THOOM" sound - very low frequency
const thoom1 = generateSine(35, 1.5); // Very deep
const thoom2 = generateSine(50, 1.5); // Still deep
const thoomEnvelope1 = applyEnvelope(thoom1, 0.02, 0.3, 0.4, 1.2);
const thoomEnvelope2 = applyEnvelope(thoom2, 0.03, 0.35, 0.35, 1.15);

// 2. Soft rumble - heavily filtered noise
const rumbleNoise = generateNoise(3);
const rumbleFiltered1 = lowPassFilter(rumbleNoise, 100);
const rumbleFiltered2 = lowPassFilter(rumbleFiltered1, 60); // Double filter
const rumbleEnvelope = applyEnvelope(rumbleFiltered2, 0.1, 0.5, 0.3, 2.4);

// 3. "Whomp" sound - medium-low frequency
const whomp = generateSine(80, 1.2);
const whompEnvelope = applyEnvelope(whomp, 0.01, 0.2, 0.3, 1);

// 4. Soft "puff" of air - very filtered noise
const puff = generateNoise(2);
const puffFiltered1 = lowPassFilter(puff, 200);
const puffFiltered2 = lowPassFilter(puffFiltered1, 150);
const puffEnvelope = applyEnvelope(puffFiltered2, 0.05, 0.3, 0.2, 1.65);

// Mix all components
const explosion = mixSignals(
  thoomEnvelope1.map(s => s * 0.35),
  thoomEnvelope2.map(s => s * 0.25),
  rumbleEnvelope.map(s => s * 0.2),
  whompEnvelope.map(s => s * 0.15),
  puffEnvelope.map(s => s * 0.15)
);

// Add some gentle reverb using simple delays
const reverb = new Float32Array(samples.length);
for (let i = 0; i < explosion.length && i < reverb.length; i++) {
  reverb[i] = explosion[i];
}

// Simple reverb with just a few delays
const delayTimes = [0.1, 0.2, 0.35, 0.5];
const delayGains = [0.5, 0.3, 0.2, 0.1];

delayTimes.forEach((delayTime, index) => {
  const delaySamples = Math.floor(delayTime * sampleRate);
  const gain = delayGains[index];
  
  for (let i = delaySamples; i < reverb.length; i++) {
    if (i - delaySamples < explosion.length) {
      reverb[i] += explosion[i - delaySamples] * gain;
    }
  }
});

// Final mix with reverb
const finalMix = lowPassFilter(reverb, 250); // Final safety filter

// Normalize gently
let maxVal = 0;
for (let i = 0; i < finalMix.length; i++) {
  maxVal = Math.max(maxVal, Math.abs(finalMix[i]));
}

// Keep it soft for kids
if (maxVal > 0) {
  for (let i = 0; i < finalMix.length; i++) {
    finalMix[i] *= 0.5 / maxVal; // 50% volume
  }
}

saveWav('boss_explosion.wav', finalMix);

console.log('\n✅ Kid-friendly boss explosion generated!');
console.log('Features:');
console.log('- Deep bass tones only (35-80 Hz)');
console.log('- No high frequencies that could hurt ears');
console.log('- Soft volume normalization (50%)');
console.log('- Gentle reverb effect');
console.log(`\nFile saved to: ${path.join(outputDir, 'boss_explosion.wav')}`);