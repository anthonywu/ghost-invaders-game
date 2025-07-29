/**
 * Simple sound generator using Web Audio API
 * Generates game sounds in real-time without needing .wav files
 */

export class SoundGenerator {
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  /**
   * Player shoot sound - "pew" laser
   */
  playShoot() {
    const now = this.audioContext.currentTime;
    
    // Create oscillator for the main tone
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    // Frequency sweep from 2000Hz to 800Hz
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    
    // Quick attack, fast decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    // Add some noise for "laser" texture
    const noise = this.createNoise();
    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);
    
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.25);
    noise.start(now);
    noise.stop(now + 0.05);
  }
  
  /**
   * Ghost spawn sound - ethereal whoosh
   */
  playGhostSpawn(x: number, canvasWidth: number) {
    const now = this.audioContext.currentTime;
    
    // Create filtered noise
    const noise = this.createNoise();
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    const panner = this.audioContext.createStereoPanner();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.audioContext.destination);
    
    // Bandpass filter for "whoosh"
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.5);
    filter.Q.value = 2;
    
    // Volume envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    // Spatial positioning
    const panValue = (x / canvasWidth) * 2 - 1;
    panner.pan.value = panValue;
    
    noise.start(now);
    noise.stop(now + 0.5);
  }
  
  /**
   * Explosion sound
   */
  playExplosion() {
    const now = this.audioContext.currentTime;
    
    // Low frequency thump
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
    
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    // Noise burst
    const noise = this.createNoise();
    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);
    
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(8000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.linearRampToValueAtTime(0, now + 0.5);
    
    osc.start(now);
    osc.stop(now + 0.3);
    noise.start(now);
    noise.stop(now + 0.5);
  }
  
  /**
   * Nuke ready charging sound
   */
  playNukeReady() {
    const now = this.audioContext.currentTime;
    
    // Rising sine sweep
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 2);
    
    // Pulsing volume
    gain.gain.setValueAtTime(0, now);
    for (let i = 0; i < 8; i++) {
      const t = i * 0.25;
      gain.gain.linearRampToValueAtTime(0.1 + (i * 0.02), now + t + 0.1);
      gain.gain.linearRampToValueAtTime(0.05, now + t + 0.2);
    }
    
    osc.start(now);
    osc.stop(now + 2);
  }
  
  /**
   * Helper function to create white noise
   */
  private createNoise(): AudioBufferSourceNode {
    const bufferSize = 2 * this.audioContext.sampleRate;
    const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const whiteNoise = this.audioContext.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    
    return whiteNoise;
  }
  
  /**
   * Resume audio context (needed for some browsers)
   */
  resume() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}