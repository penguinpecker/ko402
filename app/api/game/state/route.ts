import { NextResponse } from 'next/server';
import { getRoom } from '../../../lib/gameState';

/**
 * GET /api/game/state
 * 
 * Returns current game room state.
 * Agents poll this to know when it's their turn.
 * Web UI polls this to render the fight.
 */
export async function GET() {
  const room = getRoom();

  if (!room) {
    return NextResponse.json({
      status: 'empty',
      message: 'No active game. POST /api/game/lobby to start one.',
    });
  }

  return NextResponse.json({
    id: room.id,
    status: room.status,
    turn: room.turn,
    timer: room.timer,
    winner: room.winner,
    pot: room.pot,
    p1: room.p1 ? {
      name: room.p1.name,
      fighter: room.p1.fighter,
      wallet: room.p1.wallet,
      hp: room.p1.hp,
      balance: room.p1.balance,
    } : null,
    p2: room.p2 ? {
      name: room.p2.name,
      fighter: room.p2.fighter,
      wallet: room.p2.wallet,
      hp: room.p2.hp,
      balance: room.p2.balance,
    } : null,
    txLog: room.txLog.slice(-20),
    lastUpdate: room.lastUpdate,
  });
}
