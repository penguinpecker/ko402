import { NextRequest, NextResponse } from 'next/server';
import { agentPayForMove } from '../../../lib/stellar';

/**
 * POST /api/game/deposit
 * 
 * Agent deposits pot entry fee (0.1 USDC) into the server escrow wallet.
 * This is a REAL Stellar payment — agent signs with its own key.
 * 
 * Body: { agentNum: 1 | 2 }
 */
export async function POST(request: NextRequest) {
  try {
    const { agentNum } = await request.json();

    if (![1, 2].includes(agentNum)) {
      return NextResponse.json({ error: 'agentNum must be 1 or 2' }, { status: 400 });
    }

    const agentSecret = agentNum === 1
      ? process.env.AGENT1_STELLAR_SECRET
      : process.env.AGENT2_STELLAR_SECRET;

    const agentPublic = agentNum === 1
      ? process.env.AGENT1_STELLAR_PUBLIC
      : process.env.AGENT2_STELLAR_PUBLIC;

    if (!agentSecret) {
      return NextResponse.json({ error: `Agent ${agentNum} secret not configured` }, { status: 500 });
    }

    // Deposit 0.1 USDC into escrow (server wallet)
    const result = await agentPayForMove(agentSecret, '0.1000000');

    if (!result.success) {
      return NextResponse.json({
        error: 'Deposit failed',
        details: result.error,
      }, { status: 402 });
    }

    return NextResponse.json({
      success: true,
      deposit: {
        hash: result.hash,
        ledger: result.ledger,
        from: agentPublic,
        to: process.env.SERVER_STELLAR_PUBLIC,
        amount: '0.1',
        asset: 'USDC',
        network: 'stellar:testnet',
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
