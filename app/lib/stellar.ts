import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
} from '@stellar/stellar-sdk';

// Environment
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC = new Asset('USDC', USDC_ISSUER);

const horizonServer = new Horizon.Server(HORIZON_URL);

// Agent keypairs (loaded from env)
export function getAgentKeypair(agentNum: 1 | 2): Keypair {
  const secret = agentNum === 1
    ? process.env.AGENT1_STELLAR_SECRET
    : process.env.AGENT2_STELLAR_SECRET;
  if (!secret) throw new Error(`AGENT${agentNum}_STELLAR_SECRET not set`);
  return Keypair.fromSecret(secret);
}

export function getServerKeypair(): Keypair {
  const secret = process.env.SERVER_STELLAR_SECRET;
  if (!secret) throw new Error('SERVER_STELLAR_SECRET not set');
  return Keypair.fromSecret(secret);
}

// Get USDC balance for an account
export async function getUSDCBalance(publicKey: string): Promise<string> {
  try {
    const account = await horizonServer.loadAccount(publicKey);
    const usdc = account.balances.find(
      (b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
    );
    return usdc?.balance || '0';
  } catch {
    return '0';
  }
}

// Send USDC payment (for move execution)
export async function sendUSDCPayment(
  fromSecret: string,
  toPublic: string,
  amount: string,
): Promise<{ success: boolean; hash?: string; ledger?: number; error?: string }> {
  try {
    const fromKp = Keypair.fromSecret(fromSecret);
    const account = await horizonServer.loadAccount(fromKp.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: toPublic,
          asset: USDC,
          amount: amount,
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(fromKp);
    const result = await horizonServer.submitTransaction(tx);

    return {
      success: true,
      hash: result.hash,
      ledger: result.ledger,
    };
  } catch (err: any) {
    const codes = err?.response?.data?.extras?.result_codes;
    return {
      success: false,
      error: codes ? JSON.stringify(codes) : (err.message || 'Unknown error'),
    };
  }
}

// Execute a game move with real Stellar payment
export async function executeGameMove(
  agentNum: 1 | 2,
  moveType: 'light' | 'heavy' | 'block',
): Promise<{
  success: boolean;
  hash?: string;
  ledger?: number;
  cost: string;
  network: string;
  from: string;
  to: string;
  error?: string;
}> {
  const costs: Record<string, string> = {
    light: '0.0100000',
    heavy: '0.0500000',
    block: '0.0050000',
  };

  const cost = costs[moveType];
  const agentKp = getAgentKeypair(agentNum);
  const serverPub = process.env.SERVER_STELLAR_PUBLIC;

  if (!serverPub) {
    return { success: false, cost, network: 'stellar:testnet', from: '', to: '', error: 'SERVER_STELLAR_PUBLIC not set' };
  }

  const result = await sendUSDCPayment(agentKp.secret(), serverPub, cost);

  return {
    success: result.success,
    hash: result.hash,
    ledger: result.ledger,
    cost,
    network: 'stellar:testnet',
    from: agentKp.publicKey(),
    to: serverPub,
    error: result.error,
  };
}

// Release pot to winner
export async function releasePot(
  winnerPublic: string,
  amount: string,
): Promise<{ success: boolean; hash?: string; error?: string }> {
  const serverSecret = process.env.SERVER_STELLAR_SECRET;
  if (!serverSecret) {
    return { success: false, error: 'SERVER_STELLAR_SECRET not set' };
  }

  return await sendUSDCPayment(serverSecret, winnerPublic, amount);
}

// Get all game account balances
export async function getGameBalances(): Promise<{
  agent1: string;
  agent2: string;
  server: string;
  player: string;
}> {
  const [agent1, agent2, serverBal, player] = await Promise.all([
    getUSDCBalance(process.env.AGENT1_STELLAR_PUBLIC || ''),
    getUSDCBalance(process.env.AGENT2_STELLAR_PUBLIC || ''),
    getUSDCBalance(process.env.SERVER_STELLAR_PUBLIC || ''),
    getUSDCBalance(process.env.NEXT_PUBLIC_PLAYER_WALLET || ''),
  ]);

  return { agent1, agent2, server: serverBal, player };
}
