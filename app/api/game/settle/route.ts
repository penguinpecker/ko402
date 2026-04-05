import { NextRequest, NextResponse } from 'next/server';
import { releasePot } from '../../../lib/stellar';

/**
 * POST /api/game/settle
 * 
 * Releases the prize pot from the game server escrow wallet
 * to the winning agent's wallet.
 * 
 * Body: { winnerWallet, potAmount }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { winnerWallet, potAmount } = body;

    if (!winnerWallet) {
      return NextResponse.json({ error: 'winnerWallet required' }, { status: 400 });
    }

    const amount = potAmount || '0.2000000';
    const result = await releasePot(winnerWallet, amount);

    if (!result.success) {
      return NextResponse.json({
        error: 'Settlement failed',
        details: result.error,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      settlement: {
        hash: result.hash,
        ledger: result.ledger,
        from: process.env.SERVER_STELLAR_PUBLIC,
        to: winnerWallet,
        amount,
        asset: 'USDC',
        network: 'stellar:testnet',
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
