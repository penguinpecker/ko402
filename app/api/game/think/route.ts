import { NextRequest, NextResponse } from 'next/server';
import { getAgentMove, GameContext } from '../../../lib/agentBrain';

/**
 * POST /api/game/think
 * 
 * Asks GPT to decide the next move for an agent based on game state.
 * Each agent gets its own GPT call — they make independent decisions.
 * 
 * Body: GameContext (myHp, opponentHp, myBalance, etc.)
 * Returns: { move: "light" | "heavy" | "block" }
 */
export async function POST(request: NextRequest) {
  try {
    const context: GameContext = await request.json();

    if (typeof context.myHp !== 'number' || typeof context.opponentHp !== 'number') {
      return NextResponse.json({ error: 'Invalid game context' }, { status: 400 });
    }

    const move = await getAgentMove(context);

    return NextResponse.json({
      move,
      agent: context.myChar,
      reasoning: `GPT-4o-mini analyzed: HP ${context.myHp}/${context.opponentHp}, Balance ${context.myBalance.toFixed(3)}/${context.opponentBalance.toFixed(3)}, chose ${move}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
