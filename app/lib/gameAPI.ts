/**
 * Game API hooks for real Stellar x402 payments.
 * Set NEXT_PUBLIC_USE_REAL_PAYMENTS=true in .env.local to enable.
 * Falls back to mock data when disabled.
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
    // Mock mode
    const hash = mockHash();
    return {
      success: true,
      hash,
      ledger: Math.floor(3400000 + Math.random() * 10000),
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${hash}`,
      cost: moveType === 'light' ? '0.01' : moveType === 'heavy' ? '0.05' : '0.005',
      from: agentNum === 1 ? 'GABCOE5R...ROKF' : 'GBYG4FC...NJ3D',
      to: 'GCRRX5X...FZ3F',
    };
  }

  try {
    const res = await fetch('/api/game/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentNum, moveType }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        hash: '',
        ledger: 0,
        explorerUrl: '',
        cost: '0',
        from: '',
        to: '',
        error: data.error || data.details || 'Payment failed',
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
    };
  } catch (err: any) {
    return {
      success: false, hash: '', ledger: 0, explorerUrl: '',
      cost: '0', from: '', to: '',
      error: err.message || 'Network error',
    };
  }
}

export async function apiSettlePot(
  winnerAgentNum: 1 | 2,
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
      body: JSON.stringify({ winnerAgentNum, potAmount }),
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
