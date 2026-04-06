/**
 * Game API — ALL REAL. No mocks.
 * Every call hits real Stellar testnet and real OpenAI GPT.
 */

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
  ledger: number;
  explorerUrl: string;
  amount: string;
  error?: string;
}

export interface ThinkResult {
  move: 'light' | 'heavy' | 'block';
  reasoning?: string;
}

/**
 * Ask GPT to decide an agent's next move.
 * Calls POST /api/game/think → real OpenAI GPT-4o-mini.
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
}): Promise<ThinkResult> {
  const res = await fetch('/api/game/think', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(context),
  });
  const data = await res.json();
  return { move: data.move || 'light', reasoning: data.reasoning };
}

/**
 * Execute a game move with REAL Stellar payment.
 * Calls POST /api/game/move → agent pays USDC to server on Stellar testnet.
 */
export async function apiExecuteMove(
  agentNum: 1 | 2,
  moveType: 'light' | 'heavy' | 'block',
): Promise<MoveResult> {
  const res = await fetch('/api/game/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentNum, moveType }),
  });
  const data = await res.json();

  if (!res.ok || !data.success) {
    return {
      success: false, hash: '', ledger: 0, explorerUrl: '',
      cost: '0', from: '', to: '', network: 'stellar:testnet',
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
    network: data.tx.network,
  };
}

/**
 * Settle the pot — server wallet pays winner.
 * Calls POST /api/game/settle → REAL Stellar tx.
 */
export async function apiSettlePot(
  winnerWallet: string,
  potAmount: string,
): Promise<SettleResult> {
  const res = await fetch('/api/game/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ winnerWallet, potAmount }),
  });
  const data = await res.json();

  if (!res.ok || !data.success) {
    return { success: false, hash: '', ledger: 0, explorerUrl: '', amount: potAmount, error: data.error };
  }

  return {
    success: true,
    hash: data.settlement.hash,
    ledger: data.settlement.ledger || 0,
    explorerUrl: data.settlement.explorerUrl,
    amount: data.settlement.amount,
  };
}

/**
 * Get real wallet balances from Stellar Horizon.
 */
export async function apiFetchBalances(): Promise<{
  agent1: string; agent2: string; server: string; player: string;
} | null> {
  try {
    const res = await fetch('/api/game/balances');
    const data = await res.json();
    return data.balances;
  } catch {
    return null;
  }
}
