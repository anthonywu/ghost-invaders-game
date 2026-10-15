/**
 * Level definitions.
 *
 * A level is derived from the number of ghosts destroyed. It drives three
 * things: how fast ghosts move, how often they spawn, and the colour palette
 * used for ghosts, stars and UI accents. Themes cycle once the list runs out,
 * so the game keeps going indefinitely with a fresh look every level.
 */

export interface LevelTheme {
  /** Shown in the level-up banner. */
  name: string;
  /** Palette ordinary ghosts are tinted from. */
  ghostColors: string[];
  /** UI accent, ship trim and level banner colour. */
  accent: string;
  /** Star tint for the parallax layers. */
  star: string;
}

export const LEVEL_THEMES: LevelTheme[] = [
  {
    name: 'Rainbow Rift',
    ghostColors: ['#FF0000', '#FF8C00', '#FFD700', '#00FF00', '#00BFFF', '#9400D3'],
    accent: '#00E5FF',
    star: '#96A0FF'
  },
  {
    name: 'Frozen Orbit',
    ghostColors: ['#7FDBFF', '#4FC3F7', '#B3E5FC', '#00B0FF', '#81D4FA'],
    accent: '#7FDBFF',
    star: '#BFE9FF'
  },
  {
    name: 'Toxic Nebula',
    ghostColors: ['#39FF14', '#7CFC00', '#00FA9A', '#ADFF2F', '#00E676'],
    accent: '#39FF14',
    star: '#BDFFA8'
  },
  {
    name: 'Ember Belt',
    ghostColors: ['#FF6B35', '#FF3C00', '#FFA630', '#FF1E56', '#FF8C42'],
    accent: '#FF8C42',
    star: '#FFD3A8'
  },
  {
    name: 'Violet Deep',
    ghostColors: ['#B478FF', '#8A2BE2', '#DA70D6', '#9D4EDD', '#C77DFF'],
    accent: '#C77DFF',
    star: '#E0C8FF'
  },
  {
    name: 'Solar Flare',
    ghostColors: ['#FFD700', '#FFB300', '#FFE066', '#FF9E00', '#FFC300'],
    accent: '#FFD700',
    star: '#FFF0B8'
  },
  {
    name: 'Crimson Void',
    ghostColors: ['#FF1744', '#D50000', '#FF5252', '#C62828', '#FF6E6E'],
    accent: '#FF5252',
    star: '#FFC2C2'
  },
  {
    name: 'Spectral End',
    ghostColors: ['#FFFFFF', '#E0F7FA', '#B2EBF2', '#CFD8DC', '#ECEFF1'],
    accent: '#FFFFFF',
    star: '#FFFFFF'
  }
];

/** Ghosts that must be destroyed to advance one level. */
export const KILLS_PER_LEVEL = 20;

/**
 * Level at which speed and spawn rate stop increasing. Levels keep counting up
 * past this for score and theme purposes, but the game stops getting harder so
 * it stays playable for younger players.
 */
export const MAX_DIFFICULTY_LEVEL = 8;

export function levelFromKills(ghostsDestroyed: number): number {
  return Math.floor(ghostsDestroyed / KILLS_PER_LEVEL) + 1;
}

export function themeForLevel(level: number): LevelTheme {
  return LEVEL_THEMES[(level - 1) % LEVEL_THEMES.length];
}

/** 0 on level 1, rising to 1 at MAX_DIFFICULTY_LEVEL and flat after that. */
export function difficultyForLevel(level: number): number {
  return Math.min(1, (level - 1) / (MAX_DIFFICULTY_LEVEL - 1));
}

/** Ship visual tier: upgrades at levels 3 and 6. */
export function shipTierForLevel(level: number): 1 | 2 | 3 {
  if (level >= 6) return 3;
  if (level >= 3) return 2;
  return 1;
}
