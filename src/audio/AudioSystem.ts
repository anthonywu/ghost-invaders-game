/**
 * Complete audio system for Ghost Invaders
 * Generates all sounds programmatically using Web Audio API
 */

export class AudioSystem {
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private musicGain: GainNode;
  private sfxGain: GainNode;
  
  // Music state
  private musicPlaying: boolean = false;
  private currentTempo: number = 120;
  private musicNodes: any[] = [];
  private nextNoteTime: number = 0;
  private noteLength: number = 0.125; // 16th note
  
  // Settings
  private musicVolume: number = 0.3;
  private sfxVolume: number = 0.6;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create gain nodes for mixing
    this.masterGain = this.audioContext.createGain();
    this.musicGain = this.audioContext.createGain();
    this.sfxGain = this.audioContext.createGain();
    
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
    
    this.musicGain.gain.value = this.musicVolume;
    this.sfxGain.gain.value = this.sfxVolume;
  }
  
  /**
   * Initialize audio (call on first user interaction)
   */
  init() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
  
  // ========== SOUND EFFECTS ==========
  
  /**
   * Player shoot - classic "pew" laser sound
   */
  playShoot() {
    const now = this.audioContext.currentTime;
    const duration = 0.25;
    
    // Main laser tone
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    // Frequency sweep
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    
    // Filter for "laser" quality
    filter.type = 'lowpass';
    filter.frequency.value = 3000;
    filter.Q.value = 5;
    
    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    // Add noise burst
    const noise = this.createNoise(0.05);
    const noiseGain = this.audioContext.createGain();
    const noiseFilter = this.audioContext.createBiquadFilter();
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    
    noiseGain.gain.setValueAtTime(0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    // Random pitch variation
    const pitchVariation = 1 + (Math.random() - 0.5) * 0.1;
    osc.frequency.value *= pitchVariation;
    
    osc.start(now);
    osc.stop(now + duration);
    noise.start(now);
    noise.stop(now + 0.05);
  }
  
  /**
   * Ghost spawn - ethereal whoosh with formant "hahhh"
   */
  playGhostSpawn(ghostType: 'normal' | 'special' | 'rainbow' | 'boss', x: number, canvasWidth: number) {
    const now = this.audioContext.currentTime;
    const panner = this.audioContext.createStereoPanner();
    panner.connect(this.sfxGain);
    
    // Spatial positioning
    const panValue = (x / canvasWidth) * 2 - 1;
    panner.pan.value = panValue;
    
    switch (ghostType) {
      case 'normal':
        this.playNormalGhostSpawn(panner, now);
        break;
      case 'special':
        this.playSpecialGhostSpawn(panner, now);
        break;
      case 'rainbow':
        this.playRainbowGhostSpawn(panner, now);
        break;
      case 'boss':
        this.playBossGhostSpawn(panner, now);
        break;
    }
  }
  
  private playNormalGhostSpawn(output: AudioNode, now: number) {
    // Whoosh noise
    const noise = this.createNoise(0.5);
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + 0.5);
    filter.Q.value = 2;
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    // Ghost "hahhh" vocalization
    const osc = this.audioContext.createOscillator();
    const formantGain = this.audioContext.createGain();
    
    osc.frequency.value = 130; // C3
    osc.connect(formantGain);
    formantGain.connect(output);
    
    formantGain.gain.setValueAtTime(0, now);
    formantGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
    formantGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    noise.start(now);
    noise.stop(now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  }
  
  private playSpecialGhostSpawn(output: AudioNode, now: number) {
    // Bell/chime arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(output);
      
      const startTime = now + (i * 0.1);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
      
      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  }
  
  private playRainbowGhostSpawn(output: AudioNode, now: number) {
    // Magical sparkle cascade
    const baseNotes = [261.63, 293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 523.25]; // C4 to C5
    
    baseNotes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const delay = this.audioContext.createDelay();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      // Add harmonics for sparkle
      const osc2 = this.audioContext.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 3;
      
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(delay);
      delay.connect(output);
      
      delay.delayTime.value = i * 0.05;
      
      const startTime = now + (i * 0.1);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
      
      osc.start(startTime);
      osc.stop(startTime + 1.2);
      osc2.start(startTime);
      osc2.stop(startTime + 1.2);
    });
  }
  
  private playBossGhostSpawn(output: AudioNode, now: number) {
    // Deep horn sound
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const osc3 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc3.type = 'sawtooth';
    
    // Slightly detuned for richness
    osc1.frequency.value = 87.31; // F1
    osc2.frequency.value = 87.31 * 1.01;
    osc3.frequency.value = 87.31 * 0.99;
    
    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 2;
    
    // Dramatic swell
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 1);
    gain.gain.linearRampToValueAtTime(0.3, now + 3);
    
    // Add tension build
    const tensionOsc = this.audioContext.createOscillator();
    const tensionGain = this.audioContext.createGain();
    
    tensionOsc.frequency.setValueAtTime(100, now);
    tensionOsc.frequency.exponentialRampToValueAtTime(200, now + 3);
    tensionOsc.connect(tensionGain);
    tensionGain.connect(output);
    
    tensionGain.gain.setValueAtTime(0.1, now);
    tensionGain.gain.linearRampToValueAtTime(0.2, now + 3);
    
    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    tensionOsc.start(now);
    
    osc1.stop(now + 3);
    osc2.stop(now + 3);
    osc3.stop(now + 3);
    tensionOsc.stop(now + 3);
  }
  
  /**
   * Ghost hit but not destroyed
   */
  playGhostHit(ghostType: 'normal' | 'special' | 'rainbow' | 'boss') {
    const now = this.audioContext.currentTime;
    
    // Impact thud
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 80;
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    // Ghost "oof" - pitch varies by type
    const voiceOsc = this.audioContext.createOscillator();
    const voiceGain = this.audioContext.createGain();
    
    const pitchMap = {
      normal: 130.81, // C3
      special: 164.81, // E3
      rainbow: 196.00, // G3
      boss: 49.00 // G1
    };
    
    voiceOsc.frequency.value = pitchMap[ghostType];
    voiceOsc.connect(voiceGain);
    voiceGain.connect(this.sfxGain);
    
    voiceGain.gain.setValueAtTime(0, now);
    voiceGain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
    voiceOsc.start(now);
    voiceOsc.stop(now + 0.2);
  }
  
  /**
   * Ghost destroyed
   */
  playGhostDestroyed(ghostType: 'normal' | 'special' | 'rainbow' | 'boss') {
    const now = this.audioContext.currentTime;
    
    // Initial pop
    const noise = this.createNoise(0.05);
    const noiseGain = this.audioContext.createGain();
    noise.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    // Deflation sweep
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    const sweepMap = {
      normal: { start: 523.25, end: 130.81 }, // C4 to C2
      special: { start: 659.25, end: 164.81 }, // E4 to E2
      rainbow: { start: 783.99, end: 196.00 }, // G4 to G2
      boss: { start: 261.63, end: 32.70 } // C3 to C0
    };
    
    const sweep = sweepMap[ghostType];
    osc.frequency.setValueAtTime(sweep.start, now);
    osc.frequency.exponentialRampToValueAtTime(sweep.end, now + 0.6);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    
    noise.start(now);
    noise.stop(now + 0.05);
    osc.start(now);
    osc.stop(now + 0.6);
    
    // Extra effects for special ghosts
    if (ghostType === 'rainbow') {
      this.playRainbowExplosion();
    } else if (ghostType === 'boss') {
      this.playBossExplosion();
    }
  }
  
  /**
   * Player movement sound
   */
  playMove(direction: 'left' | 'right') {
    const now = this.audioContext.currentTime;
    
    const noise = this.createNoise(0.1);
    const filter = this.audioContext.createBiquadFilter();
    const gain = this.audioContext.createGain();
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    
    // Subtle pitch shift based on direction
    const panner = this.audioContext.createStereoPanner();
    gain.connect(panner);
    panner.connect(this.sfxGain);
    panner.pan.value = direction === 'left' ? -0.5 : 0.5;
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.1);
    
    noise.start(now);
    noise.stop(now + 0.1);
  }
  
  /**
   * Nuke ready charging sound
   */
  playNukeReady() {
    const now = this.audioContext.currentTime;
    const duration = 2;
    
    // Rising sine sweep
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sine';
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    // Frequency sweep
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + duration);
    
    // Resonant filter for "energy" sound
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(200, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + duration);
    filter.Q.value = 10;
    
    // Pulsing volume
    for (let i = 0; i < 8; i++) {
      const t = i * 0.25;
      gain.gain.setValueAtTime(0.1 + (i * 0.02), now + t);
      gain.gain.linearRampToValueAtTime(0.05, now + t + 0.125);
    }
    
    // Add crackling electricity
    const crackle = this.createNoise(duration);
    const crackleFilter = this.audioContext.createBiquadFilter();
    const crackleGain = this.audioContext.createGain();
    
    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(this.sfxGain);
    
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 2000;
    crackleFilter.Q.value = 20;
    
    crackleGain.gain.setValueAtTime(0.05, now);
    crackleGain.gain.linearRampToValueAtTime(0.1, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
    crackle.start(now);
    crackle.stop(now + duration);
  }
  
  /**
   * Nuke fire - massive explosion
   */
  playNukeFire() {
    const now = this.audioContext.currentTime;
    
    // Sub-bass impact
    const subOsc = this.audioContext.createOscillator();
    const subGain = this.audioContext.createGain();
    
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(60, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.8);
    
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    
    subGain.gain.setValueAtTime(0.6, now);
    subGain.gain.linearRampToValueAtTime(0.4, now + 0.2);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    
    // Main explosion
    const noise = this.createNoise(2.5);
    const noiseFilter = this.audioContext.createBiquadFilter();
    const noiseGain = this.audioContext.createGain();
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(8000, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.8);
    
    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
    
    // Ring modulation for metallic quality
    const modOsc = this.audioContext.createOscillator();
    const modGain = this.audioContext.createGain();
    
    modOsc.frequency.value = 150;
    modOsc.connect(modGain.gain);
    noiseGain.connect(modGain);
    modGain.connect(this.sfxGain);
    
    subOsc.start(now);
    subOsc.stop(now + 2.5);
    noise.start(now);
    noise.stop(now + 2.5);
    modOsc.start(now);
    modOsc.stop(now + 0.8);
  }
  
  /**
   * Rainbow ghost explosion
   */
  playRainbowExplosion() {
    const now = this.audioContext.currentTime;
    
    // Crystal breaking - multiple high frequency bursts
    const frequencies = [2000, 3000, 4000, 5000, 6000, 8000];
    
    frequencies.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const panner = this.audioContext.createStereoPanner();
      
      osc.type = 'sine';
      osc.frequency.value = freq + (Math.random() * 500);
      
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);
      
      // Random stereo placement
      panner.pan.value = (Math.random() - 0.5) * 2;
      
      const startTime = now + (i * 0.05);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
    
    // Magical cascade
    const cascadeNotes = [];
    for (let i = 0; i < 16; i++) {
      cascadeNotes.push(1046.50 * Math.pow(2, -i/12)); // C6 descending chromatically
    }
    
    cascadeNotes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      const startTime = now + (i * 0.03);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);
      
      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });
  }
  
  /**
   * Boss ghost explosion - massive screen-clearing blast
   */
  playBossExplosion() {
    const now = this.audioContext.currentTime;
    
    // Multiple explosion layers
    for (let i = 0; i < 5; i++) {
      const delay = i * 0.3;
      
      // Each boom
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      osc.type = 'sawtooth';
      
      // Different pitches for each boom
      const pitches = [65.41, 49.00, 73.42, 43.65, 55.00]; // C2, G1, D2, A1, A1
      osc.frequency.value = pitches[i];
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);
      
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      
      const startTime = now + delay;
      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1);
      
      osc.start(startTime);
      osc.stop(startTime + 1);
      
      // Accompanying noise burst
      const noise = this.createNoise(1);
      const noiseGain = this.audioContext.createGain();
      const noiseFilter = this.audioContext.createBiquadFilter();
      
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.setValueAtTime(8000, startTime);
      noiseFilter.frequency.exponentialRampToValueAtTime(100, startTime + 1);
      
      noiseGain.gain.setValueAtTime(0.4, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1);
      
      noise.start(startTime);
      noise.stop(startTime + 1);
    }
    
    // Long rumble
    const rumble = this.createNoise(4);
    const rumbleFilter = this.audioContext.createBiquadFilter();
    const rumbleGain = this.audioContext.createGain();
    
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    
    rumbleFilter.type = 'highpass';
    rumbleFilter.frequency.value = 20;
    
    rumbleGain.gain.setValueAtTime(0.2, now);
    rumbleGain.gain.linearRampToValueAtTime(0.1, now + 2);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 4);
    
    rumble.start(now);
    rumble.stop(now + 4);
  }
  
  /**
   * Life lost sound
   */
  playLifeLost() {
    const now = this.audioContext.currentTime;
    
    // Slide whistle down
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 1);
    
    // Add vibrato
    const vibrato = this.audioContext.createOscillator();
    const vibratoGain = this.audioContext.createGain();
    
    vibrato.frequency.value = 10;
    vibratoGain.gain.value = 50;
    
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 1);
    
    // Warning alarm
    const alarm1 = this.audioContext.createOscillator();
    const alarm2 = this.audioContext.createOscillator();
    const alarmGain = this.audioContext.createGain();
    
    alarm1.type = 'square';
    alarm2.type = 'square';
    alarm1.frequency.value = 800;
    alarm2.frequency.value = 600;
    
    alarm1.connect(alarmGain);
    alarm2.connect(alarmGain);
    alarmGain.connect(this.sfxGain);
    
    // Alternating tones
    for (let i = 0; i < 3; i++) {
      const t1 = now + (i * 0.4);
      const t2 = t1 + 0.2;
      
      alarmGain.gain.setValueAtTime(0.2, t1);
      alarmGain.gain.setValueAtTime(0, t1 + 0.1);
      alarmGain.gain.setValueAtTime(0.2, t2);
      alarmGain.gain.setValueAtTime(0, t2 + 0.1);
    }
    
    osc.start(now);
    osc.stop(now + 1);
    vibrato.start(now);
    vibrato.stop(now + 1);
    alarm1.start(now);
    alarm1.stop(now + 1.2);
    alarm2.start(now + 0.2);
    alarm2.stop(now + 1.2);
  }
  
  /**
   * Extra life gained - classic 1-up sound
   */
  playExtraLife() {
    const now = this.audioContext.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5-E5-G5-C6-E6-G6
    
    notes.forEach((freq, i) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'square';
      osc.frequency.value = freq;
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      
      const startTime = now + (i * 0.1);
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.1);
      
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
    
    // Sparkle overlay
    for (let i = 0; i < 10; i++) {
      const sparkleOsc = this.audioContext.createOscillator();
      const sparkleGain = this.audioContext.createGain();
      
      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.value = 8000 + (Math.random() * 2000);
      
      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(this.sfxGain);
      
      const startTime = now + (Math.random() * 0.6);
      sparkleGain.gain.setValueAtTime(0, startTime);
      sparkleGain.gain.linearRampToValueAtTime(0.05, startTime + 0.01);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
      
      sparkleOsc.start(startTime);
      sparkleOsc.stop(startTime + 0.1);
    }
  }
  
  /**
   * Game over sound
   */
  playGameOver() {
    const now = this.audioContext.currentTime;
    
    // Organ chord - Am add9
    const notes = [110, 130.81, 164.81, 246.94]; // A2, C3, E3, B3
    const gains: GainNode[] = [];
    
    notes.forEach((freq) => {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      
      // Pitch drop over time
      osc.frequency.exponentialRampToValueAtTime(freq / 2, now + 3);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      gains.push(gain);
      
      // Slow attack for dramatic build
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.1, now + 3);
      
      osc.start(now);
      osc.stop(now + 3);
    });
    
    // Low-pass filter sweep for darkness
    const filter = this.audioContext.createBiquadFilter();
    gains.forEach(gain => {
      gain.disconnect();
      gain.connect(filter);
    });
    filter.connect(this.sfxGain);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(8000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 3);
  }
  
  /**
   * Pause/unpause sound
   */
  playPause() {
    const now = this.audioContext.currentTime;
    
    // Quick click
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = 1000;
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }
  
  /**
   * Score milestone sound
   */
  playScoreMilestone(score: number) {
    const now = this.audioContext.currentTime;
    
    // Higher pitch for higher scores
    const basePitch = 440 + (score / 100) * 50;
    
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'sine';
    osc.frequency.value = basePitch;
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }
  
  // ========== BACKGROUND MUSIC ==========
  
  /**
   * Start background music
   */
  startMusic() {
    if (this.musicPlaying) return;
    
    this.musicPlaying = true;
    this.nextNoteTime = this.audioContext.currentTime;
    this.scheduleMusic();
  }
  
  /**
   * Stop background music
   */
  stopMusic() {
    this.musicPlaying = false;
    
    // Stop all music nodes
    this.musicNodes.forEach(node => {
      if (node.stop) {
        node.stop();
      }
    });
    this.musicNodes = [];
  }
  
  /**
   * Update music intensity based on game state
   */
  updateMusicIntensity(score: number) {
    if (score < 500) {
      this.currentTempo = 120;
    } else if (score < 1000) {
      this.currentTempo = 128;
    } else {
      this.currentTempo = 136;
    }
  }
  
  private scheduleMusic() {
    if (!this.musicPlaying) return;
    
    // Schedule notes ahead of time
    while (this.nextNoteTime < this.audioContext.currentTime + 0.1) {
      this.playMusicNote();
      this.nextNoteTime += (60 / this.currentTempo) * this.noteLength; // 16th notes
    }
    
    // Check again soon
    setTimeout(() => this.scheduleMusic(), 25);
  }
  
  private playMusicNote() {
    const now = this.nextNoteTime;
    const beat = Math.floor((now * this.currentTempo / 60) % 16);
    
    // Bass pattern
    if (beat % 4 === 0) {
      const bass = this.audioContext.createOscillator();
      const bassGain = this.audioContext.createGain();
      const bassFilter = this.audioContext.createBiquadFilter();
      
      bass.type = 'sawtooth';
      bass.frequency.value = beat === 0 ? 55 : beat === 8 ? 41.2 : 49; // A1, E1, G1
      
      bass.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);
      
      bassFilter.type = 'lowpass';
      bassFilter.frequency.value = 400;
      bassFilter.Q.value = 2;
      
      bassGain.gain.setValueAtTime(0, now);
      bassGain.gain.linearRampToValueAtTime(0.3, now + 0.005);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      bass.start(now);
      bass.stop(now + 0.2);
      this.musicNodes.push(bass);
    }
    
    // Melody pattern (simplified version)
    const melodyPattern = [220, 0, 261.63, 0, 329.63, 0, 293.66, 0, 261.63, 0, 246.94, 0, 220, 0, 196, 0];
    const note = melodyPattern[beat];
    
    if (note > 0) {
      const melody = this.audioContext.createOscillator();
      const melodyGain = this.audioContext.createGain();
      
      melody.type = 'square';
      melody.frequency.value = note;
      
      melody.connect(melodyGain);
      melodyGain.connect(this.musicGain);
      
      melodyGain.gain.setValueAtTime(0, now);
      melodyGain.gain.linearRampToValueAtTime(0.15, now + 0.01);
      melodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      melody.start(now);
      melody.stop(now + 0.1);
      this.musicNodes.push(melody);
    }
    
    // Hi-hat pattern
    if (beat % 2 === 0) {
      const hihat = this.createNoise(0.05);
      const hihatGain = this.audioContext.createGain();
      const hihatFilter = this.audioContext.createBiquadFilter();
      
      hihat.connect(hihatFilter);
      hihatFilter.connect(hihatGain);
      hihatGain.connect(this.musicGain);
      
      hihatFilter.type = 'highpass';
      hihatFilter.frequency.value = 8000;
      
      hihatGain.gain.setValueAtTime(0.1, now);
      hihatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      hihat.start(now);
      hihat.stop(now + 0.05);
      this.musicNodes.push(hihat);
    }
  }
  
  // ========== HELPER FUNCTIONS ==========
  
  /**
   * Create white noise buffer
   */
  private createNoise(duration: number): AudioBufferSourceNode {
    const bufferSize = duration * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;
    
    return noise;
  }
  
  /**
   * Set master volume
   */
  setMasterVolume(volume: number) {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * Set music volume
   */
  setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.musicGain.gain.value = this.musicVolume;
  }
  
  /**
   * Set SFX volume
   */
  setSFXVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.sfxGain.gain.value = this.sfxVolume;
  }
}