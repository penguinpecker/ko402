/**
 * KO402 Account Setup Script
 * Run: npx tsx scripts/setup-accounts.ts
 * 
 * This script:
 * 1. Adds USDC trustlines to agent & server accounts
 * 2. Sends testnet USDC from player wallet to agents
 * 3. Verifies all balances
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

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

const server = new Horizon.Server(HORIZON_URL);

const accounts = [
  { name: 'Agent 1 (P1)', secret: process.env.AGENT1_STELLAR_SECRET! },
  { name: 'Agent 2 (P2)', secret: process.env.AGENT2_STELLAR_SECRET! },
  { name: 'Game Server',  secret: process.env.SERVER_STELLAR_SECRET! },
];

async function addTrustline(name: string, secret: string) {
  const kp = Keypair.fromSecret(secret);
  console.log(`\n[${name}] ${kp.publicKey()}`);
  
  try {
    const account = await server.loadAccount(kp.publicKey());
    
    // Check if trustline already exists
    const hasTrustline = account.balances.some(
      (b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
    );
    
    if (hasTrustline) {
      const usdcBalance = account.balances.find(
        (b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
      );
      console.log(`  ✓ USDC trustline exists (balance: ${usdcBalance?.balance || '0'} USDC)`);
      return;
    }
    
    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: USDC }))
      .setTimeout(30)
      .build();
    
    tx.sign(kp);
    const result = await server.submitTransaction(tx);
    console.log(`  ✓ Trustline added (tx: ${result.hash.slice(0, 16)}...)`);
  } catch (err: any) {
    console.error(`  ✗ Error: ${err.message || err}`);
  }
}

async function sendUSDC(fromSecret: string, toPublic: string, amount: string, label: string) {
  const fromKp = Keypair.fromSecret(fromSecret);
  console.log(`\n  Sending ${amount} USDC → ${label} (${toPublic.slice(0, 8)}...)`);
  
  try {
    const account = await server.loadAccount(fromKp.publicKey());
    
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
    const result = await server.submitTransaction(tx);
    console.log(`  ✓ Sent! (tx: ${result.hash.slice(0, 16)}...)`);
  } catch (err: any) {
    const codes = err?.response?.data?.extras?.result_codes;
    console.error(`  ✗ Error: ${codes ? JSON.stringify(codes) : err.message || err}`);
  }
}

async function checkBalances() {
  console.log('\n=== BALANCE CHECK ===');
  
  const allAccounts = [
    { name: 'Player', pubkey: process.env.NEXT_PUBLIC_PLAYER_WALLET! },
    { name: 'Agent 1', pubkey: process.env.AGENT1_STELLAR_PUBLIC! },
    { name: 'Agent 2', pubkey: process.env.AGENT2_STELLAR_PUBLIC! },
    { name: 'Server', pubkey: process.env.SERVER_STELLAR_PUBLIC! },
  ];
  
  for (const { name, pubkey } of allAccounts) {
    try {
      const account = await server.loadAccount(pubkey);
      const xlm = account.balances.find((b: any) => b.asset_type === 'native');
      const usdc = account.balances.find(
        (b: any) => b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER
      );
      console.log(`  ${name} (${pubkey.slice(0, 8)}...): ${xlm?.balance || '0'} XLM | ${usdc?.balance || 'no trustline'} USDC`);
    } catch {
      console.log(`  ${name} (${pubkey.slice(0, 8)}...): Account not found`);
    }
  }
}

async function main() {
  console.log('🎮 KO402 - Account Setup');
  console.log('========================\n');
  console.log('Network: Stellar Testnet');
  console.log('USDC Issuer:', USDC_ISSUER.slice(0, 8) + '...');
  
  // Step 1: Add trustlines
  console.log('\n--- Step 1: Adding USDC trustlines ---');
  for (const acc of accounts) {
    await addTrustline(acc.name, acc.secret);
  }
  
  // Step 2: Fund agents with USDC from player wallet
  // Only if player wallet secret is available
  const playerSecret = process.env.PLAYER_STELLAR_SECRET;
  if (playerSecret) {
    console.log('\n--- Step 2: Funding agents with USDC ---');
    await sendUSDC(playerSecret, process.env.AGENT1_STELLAR_PUBLIC!, '5', 'Agent 1');
    await sendUSDC(playerSecret, process.env.AGENT2_STELLAR_PUBLIC!, '5', 'Agent 2');
  } else {
    console.log('\n--- Step 2: Manual USDC funding needed ---');
    console.log('  Add PLAYER_STELLAR_SECRET to .env.local to auto-fund agents,');
    console.log('  or send USDC manually to:');
    console.log(`  Agent 1: ${process.env.AGENT1_STELLAR_PUBLIC}`);
    console.log(`  Agent 2: ${process.env.AGENT2_STELLAR_PUBLIC}`);
    console.log('  (5 USDC each is plenty for testing)');
    console.log('  Use Circle faucet: https://faucet.circle.com/');
  }
  
  // Step 3: Check balances
  await checkBalances();
  
  console.log('\n✅ Setup complete!');
}

main().catch(console.error);
