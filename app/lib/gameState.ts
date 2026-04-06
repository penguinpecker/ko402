/**
 * Server-side game state.
 * Lives in memory on the serverless function instance.
 * For hackathon demo — not production-grade (no persistence).
 */

export interface AgentSlot {
  wallet: string;
  fighter: string;
  name: string;
  hp: number;
  balance: number;
  ready: boolean;
  joinedAt: number;
}

export interface MoveTx {
  agent: string;
  move: string;
  dmg: number;
  cost: number;
  hash: string;
  explorerUrl: string;
  reasoning?: string;
  timestamp: number;
}

export interface GameRoom {
  id: string;
  status: 'waiting' | 'fighting' | 'ko';
  p1: AgentSlot | null;
  p2: AgentSlot | null;
  turn: number;
  currentTurn: 'p1' | 'p2' | 'both' | null;
  timer: number;
  winner: string | null;
  pot: number;
  txLog: MoveTx[];
  createdAt: number;
  lastUpdate: number;
}

// Global game room — single room for demo
let currentRoom: GameRoom | null = null;

export function getRoom(): GameRoom | null {
  // Auto-expire stale rooms (5 min)
  if (currentRoom && Date.now() - currentRoom.lastUpdate > 5 * 60 * 1000) {
    currentRoom = null;
  }
  return currentRoom;
}

export function createRoom(): GameRoom {
  currentRoom = {
    id: 'room-' + Date.now(),
    status: 'waiting',
    p1: null,
    p2: null,
    turn: 0,
    currentTurn: null,
    timer: 60,
    winner: null,
    pot: 0,
    txLog: [],
    createdAt: Date.now(),
    lastUpdate: Date.now(),
  };
  return currentRoom;
}

export function joinRoom(wallet: string, fighter: string, name: string): { slot: 'p1' | 'p2'; room: GameRoom } | { error: string } {
  if (!currentRoom || currentRoom.status === 'ko') {
    createRoom();
  }

  const room = currentRoom!;

  // Check if already joined
  if (room.p1?.wallet === wallet) return { slot: 'p1', room };
  if (room.p2?.wallet === wallet) return { slot: 'p2', room };

  if (room.status === 'fighting') {
    return { error: 'Game already in progress' };
  }

  const agent: AgentSlot = {
    wallet, fighter, name, hp: 100, balance: 1.0, ready: false,
    joinedAt: Date.now(),
  };

  if (!room.p1) {
    room.p1 = agent;
    room.lastUpdate = Date.now();
    return { slot: 'p1', room };
  }

  if (!room.p2) {
    room.p2 = agent;
    room.lastUpdate = Date.now();
    // Both players joined — start fight
    room.status = 'fighting';
    room.currentTurn = 'both';
    room.pot = 0.2;
    return { slot: 'p2', room };
  }

  return { error: 'Room is full' };
}

export function submitMove(
  wallet: string,
  move: string,
  txHash: string,
  explorerUrl: string,
  reasoning?: string,
): { success: boolean; room: GameRoom; error?: string } {
  const room = currentRoom;
  if (!room || room.status !== 'fighting') {
    return { success: false, room: room!, error: 'No active game' };
  }

  const isP1 = room.p1?.wallet === wallet;
  const isP2 = room.p2?.wallet === wallet;
  if (!isP1 && !isP2) return { success: false, room, error: 'Not in this game' };

  const attacker = isP1 ? room.p1! : room.p2!;
  const defender = isP1 ? room.p2! : room.p1!;

  // Calculate damage
  const costs: Record<string, number> = { light: 0.01, heavy: 0.05, block: 0.005 };
  const dmgRanges: Record<string, [number, number]> = { light: [10, 15], heavy: [25, 35], block: [0, 0] };
  const cost = costs[move] || 0.01;
  const [minD, maxD] = dmgRanges[move] || [0, 0];
  let dmg = minD + Math.floor(Math.random() * (maxD - minD + 1));

  // Apply block reduction
  const lastDefMove = room.txLog.filter(t => t.agent === defender.name).slice(-1)[0];
  if (lastDefMove?.move === 'block') dmg = Math.floor(dmg * 0.3);

  attacker.balance = Math.max(0, +(attacker.balance - cost).toFixed(4));
  defender.hp = Math.max(0, defender.hp - dmg);

  const tx: MoveTx = {
    agent: attacker.name, move, dmg, cost,
    hash: txHash, explorerUrl,
    reasoning, timestamp: Date.now(),
  };
  room.txLog.push(tx);
  room.turn++;
  room.lastUpdate = Date.now();

  // Check KO
  if (defender.hp <= 0) {
    room.status = 'ko';
    room.winner = attacker.name;
  }

  return { success: true, room };
}

export function resetRoom() {
  currentRoom = null;
}
