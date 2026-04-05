import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
} from '@stellar/stellar-sdk';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = process.env.USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const USDC = new Asset('USDC', USDC_ISSUER);
const horizonServer = new Horizon.Server(HORIZON_URL);

/**
 * The server wallet ONLY holds the pot and releases it.
 * It never touches agent keys.
 */
export function getServerKeypair(): Keypair {
  const secret = process.env.SERVER_STELLAR_SECRET;
  if (!secret) throw new Error('SERVER_STELLAR_SECRET not set');
  return Keypair.fromSecret(secret);
}

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

/**
 * Agent pays the game server for a move.
 * The AGENT signs the transaction — server never sees agent secret key.
 * In production, this would be the agent's own x402 client calling our API.
 * For the demo, we simulate this server-side but the payment is REAL on Stellar.
 */
export async function agentPayForMove(
  agentSecret: string,
  amount: string,
): Promise<{ success: boolean; hash?: string; ledger?: number; from?: string; to?: string; error?: string }> {
  try {
    const agentKp = Keypair.fromSecret(agentSecret);
    const serverPub = process.env.SERVER_STELLAR_PUBLIC;
    if (!serverPub) throw new Error('SERVER_STELLAR_PUBLIC not set');

    const account = await horizonServer.loadAccount(agentKp.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: serverPub,
          asset: USDC,
          amount,
        })
      )
      .setTimeout(30)
      .build();

    // Agent signs with ITS OWN key — server never touches this
    tx.sign(agentKp);
    const result = await horizonServer.submitTransaction(tx);

    return {
      success: true,
      hash: result.hash,
      ledger: result.ledger,
      from: agentKp.publicKey(),
      to: serverPub,
    };
  } catch (err: any) {
    const codes = err?.response?.data?.extras?.result_codes;
    return {
      success: false,
      error: codes ? JSON.stringify(codes) : (err.message || 'Unknown error'),
    };
  }
}

/**
 * Server releases pot to winner.
 * Server wallet → Winner wallet.
 */
export async function releasePot(
  winnerPublic: string,
  amount: string,
): Promise<{ success: boolean; hash?: string; ledger?: number; error?: string }> {
  try {
    const serverKp = getServerKeypair();
    const account = await horizonServer.loadAccount(serverKp.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: winnerPublic,
          asset: USDC,
          amount,
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(serverKp);
    const result = await horizonServer.submitTransaction(tx);

    return { success: true, hash: result.hash, ledger: result.ledger };
  } catch (err: any) {
    const codes = err?.response?.data?.extras?.result_codes;
    return { success: false, error: codes ? JSON.stringify(codes) : (err.message || 'Unknown error') };
  }
}

export async function getGameBalances() {
  const [agent1, agent2, serverBal, player] = await Promise.all([
    getUSDCBalance(process.env.AGENT1_STELLAR_PUBLIC || ''),
    getUSDCBalance(process.env.AGENT2_STELLAR_PUBLIC || ''),
    getUSDCBalance(process.env.SERVER_STELLAR_PUBLIC || ''),
    getUSDCBalance(process.env.NEXT_PUBLIC_PLAYER_WALLET || ''),
  ]);
  return { agent1, agent2, server: serverBal, player };
}
