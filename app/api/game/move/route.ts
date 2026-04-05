import { NextRequest, NextResponse } from 'next/server';
import { executeGameMove } from '../../../lib/stellar';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentNum, moveType } = body;

    if (![1, 2].includes(agentNum)) {
      return NextResponse.json({ error: 'agentNum must be 1 or 2' }, { status: 400 });
    }
    if (!['light', 'heavy', 'block'].includes(moveType)) {
      return NextResponse.json({ error: 'moveType must be light, heavy, or block' }, { status: 400 });
    }

    const result = await executeGameMove(agentNum as 1 | 2, moveType);

    if (!result.success) {
      return NextResponse.json({
        error: 'Payment failed',
        details: result.error,
        network: result.network,
      }, { status: 402 });
    }

    return NextResponse.json({
      success: true,
      tx: {
        hash: result.hash,
        ledger: result.ledger,
        network: result.network,
        from: result.from,
        to: result.to,
        cost: result.cost,
        asset: 'USDC',
        protocol: 'x402',
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
