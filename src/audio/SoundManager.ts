/**
 * Sound Manager for Ghost Invaders
 * Loads and plays all game sound effects
 */

export class SoundManager {
  private audioContext: AudioContext;
  private sounds: Map<string, AudioBuffer> = new Map();
  private masterGain: GainNode;
  private sfxGain: GainNode;
  private enabled: boolean = true;
  private loading: Promise<void>;
  
  // Sound file mappings
  private soundFiles = {
    shoot: 'player_shoot.wav',
    ghostSpawn: 'ghost_spawn.wav',
    specialGhostSpawn: 'special_ghost_spawn.wav',
    rainbowGhostSpawn: 'rainbow_ghost_spawn.wav',
    bossGhostSpawn: 'boss_ghost_spawn.wav',
    ghostHit: 'ghost_hit.wav',
    ghostDestroyed: 'ghost_destroyed.wav',
    explosion: 'explosion.wav',
    rainbowExplosion: 'rainbow_explosion.wav',
    bossExplosion: 'boss_explosion.wav',
    nukeReady: 'nuke_ready.wav',
    nukeFire: 'nuke_fire.wav',
    extraLife: 'extra_life.wav',
    lifeLost: 'life_lost.wav',
    gameOver: 'game_over.wav',
    pause: 'pause.wav'
  };
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create gain nodes
    this.masterGain = this.audioContext.createGain();
    this.sfxGain = this.audioContext.createGain();
    
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
    
    // Set default volumes
    this.masterGain.gain.value = 0.7;
    this.sfxGain.gain.value = 0.8;
    
    // Start loading sounds
    this.loading = this.loadSounds();
  }
  
  /**
   * Initialize audio context (call on first user interaction)
   */
  async init() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    await this.loading;
  }
  
  /**
   * Load all sound files
   */
  private async loadSounds() {
    const loadPromises = Object.entries(this.soundFiles).map(async ([key, filename]) => {
      try {
        const response = await fetch(`/sounds/${filename}`);
        if (!response.ok) {
          console.warn(`Failed to load sound: ${filename}`);
          return;
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sounds.set(key, audioBuffer);
      } catch (error) {
        console.warn(`Error loading sound ${filename}:`, error);
      }
    });
    
    await Promise.all(loadPromises);
    console.log(`Loaded ${this.sounds.size} sound effects`);
  }
  
  /**
   * Play a sound effect
   */
  private playSound(soundKey: string, volume: number = 1.0, pan: number = 0) {
    if (!this.enabled) return;
    
    const buffer = this.sounds.get(soundKey);
    if (!buffer) {
      console.warn(`Sound not loaded: ${soundKey}`);
      return;
    }
    
    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      const panNode = this.audioContext.createStereoPanner();
      
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(this.sfxGain);
      
      gainNode.gain.value = volume;
      panNode.pan.value = Math.max(-1, Math.min(1, pan));
      
      source.start();
    } catch (error) {
      console.warn(`Error playing sound ${soundKey}:`, error);
    }
  }
  
  /**
   * Calculate stereo pan based on x position
   */
  private calculatePan(x: number, canvasWidth: number): number {
    return (x / canvasWidth) * 2 - 1;
  }
  
  // ========== PUBLIC SOUND METHODS ==========
  
  playShoot() {
    this.playSound('shoot', 0.5);
  }
  
  playGhostSpawn(ghostType: 'normal' | 'special' | 'rainbow' | 'boss', x: number, canvasWidth: number) {
    const pan = this.calculatePan(x, canvasWidth);
    
    switch (ghostType) {
      case 'normal':
        this.playSound('ghostSpawn', 0.4, pan);
        break;
      case 'special':
        this.playSound('specialGhostSpawn', 0.5, pan);
        break;
      case 'rainbow':
        this.playSound('rainbowGhostSpawn', 0.6, pan);
        break;
      case 'boss':
        this.playSound('bossGhostSpawn', 0.7, pan);
        break;
    }
  }
  
  playGhostHit() {
    this.playSound('ghostHit', 0.4);
  }
  
  playGhostDestroyed(ghostType: 'normal' | 'special' | 'rainbow' | 'boss') {
    if (ghostType === 'rainbow') {
      this.playSound('rainbowExplosion', 0.6);
    } else if (ghostType === 'boss') {
      this.playSound('bossExplosion', 0.8);
    } else {
      this.playSound('ghostDestroyed', 0.5);
    }
  }
  
  playExplosion() {
    this.playSound('explosion', 0.6);
  }
  
  playNukeReady() {
    this.playSound('nukeReady', 0.5);
  }
  
  playNukeFire() {
    this.playSound('nukeFire', 0.7);
  }
  
  playExtraLife() {
    this.playSound('extraLife', 0.6);
  }
  
  playLifeLost() {
    this.playSound('lifeLost', 0.5);
  }
  
  playGameOver() {
    this.playSound('gameOver', 0.6);
  }
  
  playPause() {
    this.playSound('pause', 0.3);
  }
  
  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number) {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * Set SFX volume (0-1)
   */
  setSFXVolume(volume: number) {
    this.sfxGain.gain.value = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * Toggle sound on/off
   */
  toggleSound(): boolean {
    this.enabled = !this.enabled;
    return this.enabled;
  }
  
  /**
   * Get sound enabled status
   */
  isSoundEnabled(): boolean {
    return this.enabled;
  }
}