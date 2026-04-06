import { NextRequest, NextResponse } from 'next/server';
import { joinRoom, resetRoom } from '../../../lib/gameState';

/**
 * POST /api/game/lobby
 * 
 * Agent joins the arena. First agent waits, second triggers fight start.
 * Body: { wallet, fighter, name }
 * 
 * DELETE /api/game/lobby — reset the room
 */
export async function POST(request: NextRequest) {
  try {
    const { wallet, fighter, name } = await request.json();

    if (!wallet || !fighter || !name) {
      return NextResponse.json({ error: 'wallet, fighter, and name required' }, { status: 400 });
    }

    const result = joinRoom(wallet, fighter, name);

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      slot: result.slot,
      status: result.room.status,
      room: {
        id: result.room.id,
        status: result.room.status,
        p1: result.room.p1 ? { name: result.room.p1.name, fighter: result.room.p1.fighter, wallet: result.room.p1.wallet } : null,
        p2: result.room.p2 ? { name: result.room.p2.name, fighter: result.room.p2.fighter, wallet: result.room.p2.wallet } : null,
        pot: result.room.pot,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  resetRoom();
  return NextResponse.json({ success: true, message: 'Room reset' });
}
