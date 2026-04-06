import { NextRequest, NextResponse } from 'next/server';
import { submitMove } from '../../../lib/gameState';

/**
 * POST /api/game/play
 * 
 * Agent submits a move with Stellar payment proof.
 * Body: { wallet, move, txHash, explorerUrl, reasoning? }
 */
export async function POST(request: NextRequest) {
  try {
    const { wallet, move, txHash, explorerUrl, reasoning } = await request.json();

    if (!wallet || !move) {
      return NextResponse.json({ error: 'wallet and move required' }, { status: 400 });
    }

    if (!['light', 'heavy', 'block'].includes(move)) {
      return NextResponse.json({ error: 'move must be light, heavy, or block' }, { status: 400 });
    }

    const result = await submitMove(wallet, move, txHash || '', explorerUrl || '', reasoning);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const room = result.room;
    return NextResponse.json({
      success: true,
      turn: room.turn,
      status: room.status,
      winner: room.winner,
      p1: room.p1 ? { name: room.p1.name, hp: room.p1.hp, balance: room.p1.balance } : null,
      p2: room.p2 ? { name: room.p2.name, hp: room.p2.hp, balance: room.p2.balance } : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
