export interface SpriteData {
  src: string;
  frames: number;
  frameW: number;
  frameH: number;
}

export interface FighterConfig {
  id: string;
  name: string;
  displayName: string;
  scale: number;
  offsetY: number;
  color: string;
  buyCost: number;
  spriteFacesRight: boolean;
  sprites: Record<string, SpriteData>;
  side: 'left' | 'right' | 'both';
}

export const LEFT_FIGHTERS = ['samurai', 'kenji', 'hunter'];
export const RIGHT_FIGHTERS = ['darksamurai', 'shadowkenji', 'crimsonhunter'];

export const FIGHTERS: Record<string, FighterConfig> = {
  samurai: {
    id: 'samurai', name: 'SAMURAI', spriteFacesRight: true, displayName: 'Samurai Mack',
    scale: 3.8, offsetY: 20, color: '#FFD700', buyCost: 0.1, side: 'left',
    sprites: {
      idle:    { src: '/sprites/samurai/Idle.png',    frames: 8, frameW: 200, frameH: 200 },
      attack1: { src: '/sprites/samurai/Attack1.png', frames: 6, frameW: 200, frameH: 200 },
      attack2: { src: '/sprites/samurai/Attack2.png', frames: 6, frameW: 200, frameH: 200 },
      takehit: { src: '/sprites/samurai/TakeHit.png', frames: 4, frameW: 200, frameH: 200 },
      death:   { src: '/sprites/samurai/Death.png',   frames: 6, frameW: 200, frameH: 200 },
    },
  },
  kenji: {
    id: 'kenji', name: 'KENJI', spriteFacesRight: false, displayName: 'Shadow Kenji',
    scale: 3.8, offsetY: 20, color: '#FF4466', buyCost: 0.1, side: 'left',
    sprites: {
      idle:    { src: '/sprites/kenji/Idle.png',    frames: 4, frameW: 200, frameH: 200 },
      attack1: { src: '/sprites/kenji/Attack1.png', frames: 4, frameW: 200, frameH: 200 },
      attack2: { src: '/sprites/kenji/Attack2.png', frames: 4, frameW: 200, frameH: 200 },
      takehit: { src: '/sprites/kenji/TakeHit.png', frames: 3, frameW: 200, frameH: 200 },
      death:   { src: '/sprites/kenji/Death.png',   frames: 7, frameW: 200, frameH: 200 },
    },
  },
  hunter: {
    id: 'hunter', name: 'HUNTER', spriteFacesRight: true, displayName: 'Blade Hunter',
    scale: 4.5, offsetY: 15, color: '#44FF88', buyCost: 0.1, side: 'left',
    sprites: {
      idle:    { src: '/sprites/hunter/Idle.png',    frames: 10, frameW: 126, frameH: 126 },
      attack1: { src: '/sprites/hunter/Attack1.png', frames: 7,  frameW: 126, frameH: 126 },
      takehit: { src: '/sprites/hunter/TakeHit.png', frames: 3,  frameW: 126, frameH: 126 },
      death:   { src: '/sprites/hunter/Death.png',   frames: 11, frameW: 126, frameH: 126 },
    },
  },
  darksamurai: {
    id: 'darksamurai', name: 'DARK SAMURAI', spriteFacesRight: true, displayName: 'Dark Ronin',
    scale: 3.8, offsetY: 20, color: '#8B5CF6', buyCost: 0.1, side: 'right',
    sprites: {
      idle:    { src: '/sprites/darksamurai/Idle.png',    frames: 8, frameW: 200, frameH: 200 },
      attack1: { src: '/sprites/darksamurai/Attack1.png', frames: 6, frameW: 200, frameH: 200 },
      attack2: { src: '/sprites/darksamurai/Attack2.png', frames: 6, frameW: 200, frameH: 200 },
      takehit: { src: '/sprites/darksamurai/TakeHit.png', frames: 4, frameW: 200, frameH: 200 },
      death:   { src: '/sprites/darksamurai/Death.png',   frames: 6, frameW: 200, frameH: 200 },
    },
  },
  shadowkenji: {
    id: 'shadowkenji', name: 'VENOM KENJI', spriteFacesRight: false, displayName: 'Venom Kenji',
    scale: 3.8, offsetY: 20, color: '#22C55E', buyCost: 0.1, side: 'right',
    sprites: {
      idle:    { src: '/sprites/shadowkenji/Idle.png',    frames: 4, frameW: 200, frameH: 200 },
      attack1: { src: '/sprites/shadowkenji/Attack1.png', frames: 4, frameW: 200, frameH: 200 },
      attack2: { src: '/sprites/shadowkenji/Attack2.png', frames: 4, frameW: 200, frameH: 200 },
      takehit: { src: '/sprites/shadowkenji/TakeHit.png', frames: 3, frameW: 200, frameH: 200 },
      death:   { src: '/sprites/shadowkenji/Death.png',   frames: 7, frameW: 200, frameH: 200 },
    },
  },
  crimsonhunter: {
    id: 'crimsonhunter', name: 'CRIMSON HUNTER', spriteFacesRight: true, displayName: 'Blood Hunter',
    scale: 4.5, offsetY: 15, color: '#EF4444', buyCost: 0.1, side: 'right',
    sprites: {
      idle:    { src: '/sprites/crimsonhunter/Idle.png',    frames: 10, frameW: 126, frameH: 126 },
      attack1: { src: '/sprites/crimsonhunter/Attack1.png', frames: 7,  frameW: 126, frameH: 126 },
      takehit: { src: '/sprites/crimsonhunter/TakeHit.png', frames: 3,  frameW: 126, frameH: 126 },
      death:   { src: '/sprites/crimsonhunter/Death.png',   frames: 11, frameW: 126, frameH: 126 },
    },
  },
};

export interface MoveConfig {
  id: string; name: string; cost: number; minDmg: number; maxDmg: number; animKey: string; icon: string;
}

export const MOVES: Record<string, MoveConfig> = {
  light:  { id: 'light',  name: 'LIGHT ATK', cost: 0.01,  minDmg: 10, maxDmg: 15, animKey: 'attack1', icon: '👊' },
  heavy:  { id: 'heavy',  name: 'HEAVY ATK', cost: 0.05,  minDmg: 25, maxDmg: 35, animKey: 'attack2', icon: '💥' },
  block:  { id: 'block',  name: 'BLOCK',     cost: 0.005, minDmg: 0,  maxDmg: 0,  animKey: 'idle',    icon: '🛡️' },
};

export const GAME_CONFIG = {
  maxHp: 100,
  startBalance: 1.0,
  potPerPlayer: 0.1,
  blockDamageReduction: 0.7,
  turnDelayMs: 1600,
  animSpeedIdle: 10,
  animSpeedAction: 6,
  groundYPercent: 0.75,
  p1StartXPercent: 0.32,
  p2StartXPercent: 0.68,
};

export type GameState = 'HOME' | 'SELECT' | 'VS' | 'FIGHT_INTRO' | 'FIGHT' | 'KO';

export interface PlayerState {
  char: string | null; hp: number; maxHp: number; balance: number;
  x: number; y: number; anim: string; frame: number; frameTimer: number;
  facing: 1 | -1; blocking: boolean; isDead: boolean;
}

export interface TxEntry {
  id: string; agent: string; move: string; cost: number; dmg: number; hash: string; ledger: number; timestamp: number;
}

export function createPlayer(facing: 1 | -1): PlayerState {
  return {
    char: null, hp: GAME_CONFIG.maxHp, maxHp: GAME_CONFIG.maxHp, balance: GAME_CONFIG.startBalance,
    x: 0, y: 0, anim: 'idle', frame: 0, frameTimer: 0, facing, blocking: false, isDead: false,
  };
}
