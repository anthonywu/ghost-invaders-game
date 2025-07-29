import fs from 'fs';
import pkg from 'wavefile';
const { WaveFile } = pkg;

// Create a 30-second looping background music track with space cowboy theme
const sampleRate = 44100;
const duration = 30; // seconds
const samples = new Float32Array(sampleRate * duration);

// Musical scales and notes
const notes = {
    // Pentatonic scale for western feel
    C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
    C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
    
    // Add some blues notes
    Eb3: 155.56, Bb3: 233.08, Eb4: 311.13, Bb4: 466.16,
    
    // Bass notes
    C2: 65.41, G2: 98.00, A2: 110.00, E2: 82.41
};

// Helper functions
function oscillator(freq, time, type = 'sine') {
    switch(type) {
        case 'sine':
            return Math.sin(2 * Math.PI * freq * time);
        case 'square':
            return Math.sin(2 * Math.PI * freq * time) > 0 ? 1 : -1;
        case 'sawtooth':
            return 2 * ((freq * time) % 1) - 1;
        case 'triangle':
            const period = 1 / freq;
            const t = time % period;
            return 4 * Math.abs(t / period - 0.5) - 1;
        default:
            return 0;
    }
}

function envelope(time, attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.2, noteLength = 0.5) {
    if (time < attack) {
        return time / attack;
    } else if (time < attack + decay) {
        return 1 - (1 - sustain) * ((time - attack) / decay);
    } else if (time < noteLength - release) {
        return sustain;
    } else if (time < noteLength) {
        return sustain * (1 - (time - (noteLength - release)) / release);
    }
    return 0;
}

// Reverb effect
function reverb(sample, index, buffer, mix = 0.3, delay = 0.03) {
    const delaySamples = Math.floor(delay * sampleRate);
    if (index > delaySamples) {
        return sample + mix * buffer[index - delaySamples];
    }
    return sample;
}

// Pattern sequences
const bassPattern = [
    { note: 'C2', duration: 1 },
    { note: 'C2', duration: 0.5 },
    { note: 'G2', duration: 0.5 },
    { note: 'A2', duration: 1 },
    { note: 'E2', duration: 1 }
];

const melodyPatternA = [
    // Exciting space section
    { note: 'C5', duration: 0.25 },
    { note: 'E5', duration: 0.25 },
    { note: 'G5', duration: 0.5 },
    { note: 'E5', duration: 0.25 },
    { note: 'D5', duration: 0.25 },
    { note: 'C5', duration: 0.5 }
];

const melodyPatternB = [
    // Relaxing western section
    { note: 'A4', duration: 0.75 },
    { note: 'G4', duration: 0.25 },
    { note: 'E4', duration: 0.5 },
    { note: 'D4', duration: 0.5 },
    { note: 'C4', duration: 1 }
];

const arpeggioPattern = [
    { note: 'C3', duration: 0.125 },
    { note: 'E3', duration: 0.125 },
    { note: 'G3', duration: 0.125 },
    { note: 'C4', duration: 0.125 }
];

// Generate the track
let time = 0;
const beatLength = 0.5; // seconds per beat
const barLength = beatLength * 4; // 4/4 time

for (let i = 0; i < samples.length; i++) {
    time = i / sampleRate;
    const barPosition = (time % barLength) / barLength;
    const songPosition = time / duration;
    
    // Determine section (alternating exciting/relaxing every 8 bars)
    const section = Math.floor(time / (barLength * 4)) % 2;
    const isExciting = section === 0;
    
    // Bass line (continuous throughout)
    const bassIndex = Math.floor((time % (barLength * 2)) / beatLength) % bassPattern.length;
    const bassNote = bassPattern[bassIndex];
    const bassFreq = notes[bassNote.note];
    const bassTime = (time % beatLength) / beatLength;
    const bassEnv = envelope(bassTime, 0.01, 0.05, 0.3, 0.1, bassNote.duration);
    const bass = oscillator(bassFreq, time, 'sawtooth') * bassEnv * 0.3;
    
    // Lead melody
    let lead = 0;
    if (isExciting) {
        // Fast arpeggiated space sounds
        const melodyIndex = Math.floor((time % 2) * 4) % melodyPatternA.length;
        const melodyNote = melodyPatternA[melodyIndex];
        const melodyFreq = notes[melodyNote.note];
        const melodyTime = (time % (beatLength / 2)) / (beatLength / 2);
        const melodyEnv = envelope(melodyTime, 0.001, 0.05, 0.6, 0.05, melodyNote.duration);
        lead = oscillator(melodyFreq, time, 'square') * melodyEnv * 0.25;
        
        // Add space laser effect
        const laserFreq = 800 + Math.sin(time * 50) * 400;
        const laserEnv = (barPosition > 0.75 && barPosition < 0.9) ? 0.2 : 0;
        lead += oscillator(laserFreq, time, 'sine') * laserEnv * 0.15;
    } else {
        // Slower western melody
        const melodyIndex = Math.floor((time % 4) / 0.5) % melodyPatternB.length;
        const melodyNote = melodyPatternB[melodyIndex];
        const melodyFreq = notes[melodyNote.note];
        const melodyTime = (time % beatLength) / beatLength;
        const melodyEnv = envelope(melodyTime, 0.05, 0.1, 0.7, 0.2, melodyNote.duration);
        lead = oscillator(melodyFreq, time, 'triangle') * melodyEnv * 0.3;
    }
    
    // Arpeggio accompaniment
    const arpIndex = Math.floor((time % 0.5) * 8) % arpeggioPattern.length;
    const arpNote = arpeggioPattern[arpIndex];
    const arpFreq = notes[arpNote.note];
    const arpTime = (time % 0.125) / 0.125;
    const arpEnv = envelope(arpTime, 0.001, 0.02, 0.4, 0.02, arpNote.duration);
    const arp = oscillator(arpFreq, time, isExciting ? 'sawtooth' : 'sine') * arpEnv * 0.2;
    
    // Pad/atmosphere
    const padFreq1 = notes.C3;
    const padFreq2 = notes.G3;
    const padFreq3 = notes.E3;
    const pad = (
        oscillator(padFreq1, time, 'sine') * 0.1 +
        oscillator(padFreq2, time, 'sine') * 0.08 +
        oscillator(padFreq3, time, 'sine') * 0.06
    ) * (isExciting ? 0.5 : 1);
    
    // Rhythm (hi-hat simulation)
    const hihatEnv = (barPosition % 0.25 < 0.05) ? 0.3 : 0;
    const hihat = (Math.random() - 0.5) * hihatEnv * (isExciting ? 0.2 : 0.1);
    
    // Mix all elements
    let sample = bass + lead + arp + pad + hihat;
    
    // Apply reverb
    sample = reverb(sample, i, samples, 0.25, 0.02);
    
    // Fade in/out for smooth looping
    const fadeTime = 0.5; // seconds
    if (time < fadeTime) {
        sample *= time / fadeTime;
    } else if (time > duration - fadeTime) {
        sample *= (duration - time) / fadeTime;
    }
    
    // Soft clipping
    sample = Math.tanh(sample * 0.8);
    
    samples[i] = sample;
}

// Create WAV file
const wav = new WaveFile();
wav.fromScratch(1, sampleRate, '32f', samples);
wav.toBitDepth('16');

// Save the file
fs.writeFileSync('src/audio/background-music.wav', wav.toBuffer());

console.log('✓ Generated background-music.wav');
console.log('  - 30 second looping track');
console.log('  - Space cowboy theme with alternating exciting/relaxing sections');
console.log('  - Features: bass line, melody, arpeggios, atmosphere, and rhythm');