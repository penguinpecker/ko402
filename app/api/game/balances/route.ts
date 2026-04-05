import { NextResponse } from 'next/server';
import { getGameBalances } from '../../../lib/stellar';

export async function GET() {
  try {
    const balances = await getGameBalances();
    return NextResponse.json({
      balances,
      network: 'stellar:testnet',
      accounts: {
        agent1: process.env.AGENT1_STELLAR_PUBLIC,
        agent2: process.env.AGENT2_STELLAR_PUBLIC,
        server: process.env.SERVER_STELLAR_PUBLIC,
        player: process.env.NEXT_PUBLIC_PLAYER_WALLET,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
