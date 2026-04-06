import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pgraqmnsabnatyzmlycx.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncmFxbW5zYWJuYXR5em1seWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTY0OTYsImV4cCI6MjA4NzUzMjQ5Nn0.4CJme0SHy_KaipuLdnNrNQvVwWWG3ThhMLMW6zljr3E',
);

const ROOM_ID = 'current';

export interface AgentSlot {
  wallet: string; fighter: string; name: string;
  hp: number; balance: number; joinedAt: number;
}

export interface MoveTx {
  agent: string; move: string; dmg: number; cost: number;
  hash: string; explorerUrl: string; reasoning?: string; timestamp: number;
}

export interface GameRoom {
  id: string; status: 'empty' | 'waiting' | 'fighting' | 'ko';
  p1: AgentSlot | null; p2: AgentSlot | null;
  turn: number; currentTurn: 'p1' | 'p2';
  winner: string | null; pot: number;
  txLog: MoveTx[]; lastUpdate: number;
}

function rowToRoom(row: any): GameRoom {
  return {
    id: row.id, status: row.status, p1: row.p1, p2: row.p2,
    turn: row.turn, currentTurn: row.current_turn || 'p1',
    winner: row.winner, pot: parseFloat(row.pot) || 0,
    txLog: row.tx_log || [], lastUpdate: new Date(row.updated_at).getTime(),
  };
}

export async function getRoom(): Promise<GameRoom | null> {
  const { data } = await supabase.from('ko402_rooms').select('*').eq('id', ROOM_ID).single();
  if (!data) return null;
  if (Date.now() - new Date(data.updated_at).getTime() > 5 * 60 * 1000 && data.status === 'fighting') {
    await resetRoom();
    return null;
  }
  return rowToRoom(data);
}

export async function resetRoom(): Promise<void> {
  await supabase.from('ko402_rooms').update({
    status: 'empty', p1: null, p2: null, turn: 0, current_turn: 'p1',
    winner: null, pot: 0, tx_log: [], updated_at: new Date().toISOString(),
  }).eq('id', ROOM_ID);
}

export async function joinRoom(wallet: string, fighter: string, name: string): Promise<{ slot: 'p1' | 'p2'; room: GameRoom } | { error: string }> {
  const room = await getRoom();
  if (!room || room.status === 'ko') await resetRoom();

  const { data } = await supabase.from('ko402_rooms').select('*').eq('id', ROOM_ID).single();
  if (!data) return { error: 'Failed to get room' };

  if (data.p1?.wallet === wallet) return { slot: 'p1', room: rowToRoom(data) };
  if (data.p2?.wallet === wallet) return { slot: 'p2', room: rowToRoom(data) };
  if (data.status === 'fighting') return { error: 'Game already in progress' };

  const agent: AgentSlot = { wallet, fighter, name, hp: 100, balance: 1.0, joinedAt: Date.now() };

  if (!data.p1) {
    const { data: u } = await supabase.from('ko402_rooms')
      .update({ p1: agent, status: 'waiting', current_turn: 'p1', updated_at: new Date().toISOString() })
      .eq('id', ROOM_ID).select().single();
    return { slot: 'p1', room: rowToRoom(u) };
  }
  if (!data.p2) {
    const { data: u } = await supabase.from('ko402_rooms')
      .update({ p2: agent, status: 'fighting', pot: 0.2, current_turn: 'p1', updated_at: new Date().toISOString() })
      .eq('id', ROOM_ID).select().single();
    return { slot: 'p2', room: rowToRoom(u) };
  }
  return { error: 'Room is full' };
}

export async function submitMove(
  wallet: string, move: string, txHash: string, explorerUrl: string, reasoning?: string,
): Promise<{ success: boolean; room: GameRoom; error?: string }> {
  // Re-read fresh state
  const { data } = await supabase.from('ko402_rooms').select('*').eq('id', ROOM_ID).single();
  if (!data || data.status !== 'fighting') {
    return { success: false, room: data ? rowToRoom(data) : {} as GameRoom, error: 'No active game' };
  }

  const isP1 = data.p1?.wallet === wallet;
  const isP2 = data.p2?.wallet === wallet;
  if (!isP1 && !isP2) return { success: false, room: rowToRoom(data), error: 'Not in this game' };

  // Turn check — prevent simultaneous writes
  const expectedTurn = isP1 ? 'p1' : 'p2';
  if (data.current_turn !== expectedTurn) {
    return { success: false, room: rowToRoom(data), error: `Not your turn (waiting for ${data.current_turn})` };
  }

  const attacker = { ...(isP1 ? data.p1 : data.p2) };
  const defender = { ...(isP1 ? data.p2 : data.p1) };

  const costs: Record<string, number> = { light: 0.01, heavy: 0.05, block: 0.005 };
  const dmgRanges: Record<string, [number, number]> = { light: [10, 15], heavy: [25, 35], block: [0, 0] };
  const cost = costs[move] || 0.01;
  const [minD, maxD] = dmgRanges[move] || [0, 0];
  let dmg = minD + Math.floor(Math.random() * (maxD - minD + 1));

  // Block reduction
  const txLog = data.tx_log || [];
  const lastDefMove = txLog.filter((t: any) => t.agent === defender.name).slice(-1)[0];
  if (lastDefMove?.move === 'block') dmg = Math.floor(dmg * 0.3);

  attacker.balance = Math.max(0, +(attacker.balance - cost).toFixed(4));
  defender.hp = Math.max(0, defender.hp - dmg);

  txLog.push({ agent: attacker.name, move, dmg, cost, hash: txHash, explorerUrl, reasoning, timestamp: Date.now() });

  // Swap turn
  const nextTurn = isP1 ? 'p2' : 'p1';
  const updates: any = {
    turn: (data.turn || 0) + 1,
    tx_log: txLog,
    current_turn: nextTurn,
    updated_at: new Date().toISOString(),
    ...(isP1 ? { p1: attacker, p2: defender } : { p2: attacker, p1: defender }),
  };

  if (defender.hp <= 0) {
    updates.status = 'ko';
    updates.winner = attacker.name;
  }

  const { data: updated } = await supabase.from('ko402_rooms')
    .update(updates).eq('id', ROOM_ID).select().single();

  return { success: true, room: rowToRoom(updated) };
}
