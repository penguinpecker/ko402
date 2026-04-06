import { NextResponse } from 'next/server';
import { getRoom, checkTimeout } from '../../../lib/gameState';

export async function GET() {
  // Check timeout first
  const room = await checkTimeout() || await getRoom();
  if (!room) {
    return NextResponse.json({ status: 'empty', message: 'No active game. POST /api/game/lobby to start one.' });
  }

  const timeRemaining = room.status === 'fighting' && room.startedAt
    ? Math.max(0, 60 - Math.floor((Date.now() - room.startedAt) / 1000))
    : room.status === 'ko' ? 0 : 60;

  return NextResponse.json({
    id: room.id, status: room.status, turn: room.turn,
    currentTurn: room.currentTurn, timeRemaining,
    winner: room.winner, pot: room.pot,
    p1: room.p1 ? { name: room.p1.name, fighter: room.p1.fighter, wallet: room.p1.wallet, hp: room.p1.hp, balance: room.p1.balance } : null,
    p2: room.p2 ? { name: room.p2.name, fighter: room.p2.fighter, wallet: room.p2.wallet, hp: room.p2.hp, balance: room.p2.balance } : null,
    txLog: room.txLog.slice(-20), lastUpdate: room.lastUpdate,
  });
}
