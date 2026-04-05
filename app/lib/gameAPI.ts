/**
 * Game API layer.
 * 
 * NEXT_PUBLIC_USE_REAL_PAYMENTS=true → real Stellar testnet payments
 * NEXT_PUBLIC_USE_REAL_PAYMENTS=false → mock data (default)
 * 
 * Architecture:
 * - The game server holds NO agent keys
 * - Each agent is an autonomous entity with its own wallet
 * - Agents pay the server per-move via x402 (USDC on Stellar)
 * - Server holds the pot in escrow and releases to winner
 * 
 * For the hackathon demo, agent credentials are passed from server env
 * to simulate autonomous agents. In production, agents would run
 * externally and call the API with their own x402 payment signatures.
 */

const USE_REAL = process.env.NEXT_PUBLIC_USE_REAL_PAYMENTS === 'true';

export interface MoveResult {
  success: boolean;
  hash: string;
  ledger: number;
  explorerUrl: string;
  cost: string;
  from: string;
  to: string;
  network: string;
  error?: string;
}

export interface SettleResult {
  success: boolean;
  hash: string;
  explorerUrl: string;
  amount: string;
  error?: string;
}

function mockHash(): string {
  const c = 'abcdef0123456789';
  let h = '';
  for (let i = 0; i < 64; i++) h += c[Math.floor(Math.random() * c.length)];
  return h;
}

export async function apiExecuteMove(
  agentNum: 1 | 2,
  moveType: 'light' | 'heavy' | 'block',
): Promise<MoveResult> {
  if (!USE_REAL) {
    const hash = mockHash();
    return {
      success: true,
      hash,
      ledger: Math.floor(3400000 + Math.random() * 10000),
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${hash}`,
      cost: moveType === 'light' ? '0.01' : moveType === 'heavy' ? '0.05' : '0.005',
      from: agentNum === 1 ? 'GABCOE5R...ROKF' : 'GBYG4FC...NJ3D',
      to: 'GCRRX5X...FZ3F',
      network: 'stellar:testnet',
    };
  }

  try {
    const res = await fetch('/api/game/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentNum,
        moveType,
      }),
    });

    const data = await res.json();

    // Handle 402 - should not happen in demo mode since server orchestrates
    if (res.status === 402) {
      return {
        success: false, hash: '', ledger: 0, explorerUrl: '',
        cost: '0', from: '', to: '', network: 'stellar:testnet',
        error: data.error || 'Payment required — agent has insufficient USDC',
      };
    }

    if (!res.ok || !data.success) {
      return {
        success: false, hash: '', ledger: 0, explorerUrl: '',
        cost: '0', from: '', to: '', network: 'stellar:testnet',
        error: data.error || data.details || 'Move failed',
      };
    }

    return {
      success: true,
      hash: data.tx.hash,
      ledger: data.tx.ledger,
      explorerUrl: data.tx.explorerUrl,
      cost: data.tx.cost,
      from: data.tx.from,
      to: data.tx.to,
      network: data.tx.network,
    };
  } catch (err: any) {
    return {
      success: false, hash: '', ledger: 0, explorerUrl: '',
      cost: '0', from: '', to: '', network: 'stellar:testnet',
      error: err.message || 'Network error',
    };
  }
}

export async function apiSettlePot(
  winnerWallet: string,
  potAmount: string,
): Promise<SettleResult> {
  if (!USE_REAL) {
    const hash = mockHash();
    return {
      success: true,
      hash,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${hash}`,
      amount: potAmount,
    };
  }

  try {
    const res = await fetch('/api/game/settle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerWallet, potAmount }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, hash: '', explorerUrl: '', amount: potAmount, error: data.error };
    }

    return {
      success: true,
      hash: data.settlement.hash,
      explorerUrl: data.settlement.explorerUrl,
      amount: data.settlement.amount,
    };
  } catch (err: any) {
    return { success: false, hash: '', explorerUrl: '', amount: potAmount, error: err.message };
  }
}

export async function apiFetchBalances(): Promise<{
  agent1: string; agent2: string; server: string; player: string;
} | null> {
  if (!USE_REAL) return null;
  try {
    const res = await fetch('/api/game/balances');
    const data = await res.json();
    return data.balances;
  } catch {
    return null;
  }
}

/**
 * Ask GPT to decide an agent's next move.
 * Always calls GPT (even in mock payment mode) — the brain is always real.
 */
export async function apiGetAgentMove(context: {
  myHp: number;
  opponentHp: number;
  myBalance: number;
  opponentBalance: number;
  myChar: string;
  opponentChar: string;
  roundNum: number;
  timeLeft: number;
  lastOpponentMove: string | null;
  myLastMove: string | null;
}): Promise<{ move: 'light' | 'heavy' | 'block'; reasoning?: string }> {
  try {
    const res = await fetch('/api/game/think', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    const data = await res.json();
    if (data.move) {
      return { move: data.move, reasoning: data.reasoning };
    }
    return { move: 'light' };
  } catch {
    // Fallback if API fails
    return { move: 'light' };
  }
}
