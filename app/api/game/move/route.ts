import { NextRequest, NextResponse } from 'next/server';
import { agentPayForMove } from '../../../lib/stellar';

/**
 * POST /api/game/move
 * 
 * Proper x402 architecture:
 * 
 * PRODUCTION FLOW (any agent can play):
 *   1. External agent calls POST /api/game/move { moveType, agentWallet }
 *   2. Server returns 402 Payment Required with price
 *   3. Agent signs x402 payment with its OWN key
 *   4. Agent retries with PAYMENT-SIGNATURE header
 *   5. Server verifies via facilitator, executes move
 * 
 * DEMO FLOW (for hackathon — agents run server-side):
 *   1. Frontend sends { agentNum, moveType }
 *   2. Server looks up agent key from env (AGENT1_SECRET or AGENT2_SECRET)
 *   3. Server makes the REAL Stellar payment on agent's behalf
 *   4. Returns real tx hash
 * 
 * The payment is real either way — it hits Stellar testnet.
 * The only difference is WHERE the agent key lives.
 */

const MOVE_COSTS: Record<string, string> = {
  light: '0.0100000',
  heavy: '0.0500000',
  block: '0.0050000',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentNum, moveType } = body;

    if (!moveType || !MOVE_COSTS[moveType]) {
      return NextResponse.json({ error: 'Invalid moveType. Use: light, heavy, block' }, { status: 400 });
    }

    // Look up agent credentials from server env
    // In production: agent sends PAYMENT-SIGNATURE header instead
    let agentSecret: string | undefined;
    let agentPublic: string | undefined;

    if (agentNum === 1) {
      agentSecret = process.env.AGENT1_STELLAR_SECRET;
      agentPublic = process.env.AGENT1_STELLAR_PUBLIC;
    } else if (agentNum === 2) {
      agentSecret = process.env.AGENT2_STELLAR_SECRET;
      agentPublic = process.env.AGENT2_STELLAR_PUBLIC;
    } else {
      // External agent — return 402 payment requirements
      return NextResponse.json({
        error: 'Payment required',
        x402: {
          version: 1,
          accepts: [{
            scheme: 'exact',
            network: 'stellar:testnet',
            price: MOVE_COSTS[moveType],
            asset: 'USDC',
            payTo: process.env.SERVER_STELLAR_PUBLIC,
            description: `KO402 move: ${moveType}`,
          }],
        },
      }, {
        status: 402,
        headers: {
          'X-Payment-Required': JSON.stringify({
            scheme: 'exact',
            network: 'stellar:testnet',
            price: MOVE_COSTS[moveType],
            payTo: process.env.SERVER_STELLAR_PUBLIC,
          }),
        },
      });
    }

    if (!agentSecret) {
      return NextResponse.json({ error: `AGENT${agentNum}_STELLAR_SECRET not configured` }, { status: 500 });
    }

    // Execute real Stellar payment: Agent → Server
    const cost = MOVE_COSTS[moveType];
    const result = await agentPayForMove(agentSecret, cost);

    if (!result.success) {
      return NextResponse.json({
        error: 'x402 payment failed on Stellar',
        details: result.error,
      }, { status: 402 });
    }

    return NextResponse.json({
      success: true,
      move: moveType,
      agent: agentPublic,
      tx: {
        hash: result.hash,
        ledger: result.ledger,
        network: 'stellar:testnet',
        from: result.from,
        to: result.to,
        cost,
        asset: 'USDC',
        protocol: 'x402',
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
