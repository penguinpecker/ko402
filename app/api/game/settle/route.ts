import { NextRequest, NextResponse } from 'next/server';
import { releasePot } from '../../../lib/stellar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { winnerAgentNum, potAmount } = body;

    if (![1, 2].includes(winnerAgentNum)) {
      return NextResponse.json({ error: 'winnerAgentNum must be 1 or 2' }, { status: 400 });
    }

    const winnerPublic = winnerAgentNum === 1
      ? process.env.AGENT1_STELLAR_PUBLIC
      : process.env.AGENT2_STELLAR_PUBLIC;

    if (!winnerPublic) {
      return NextResponse.json({ error: 'Winner public key not configured' }, { status: 500 });
    }

    const amount = potAmount || '0.2000000';
    const result = await releasePot(winnerPublic, amount);

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
        from: process.env.SERVER_STELLAR_PUBLIC,
        to: winnerPublic,
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
