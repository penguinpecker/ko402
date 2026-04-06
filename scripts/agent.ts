#!/usr/bin/env npx tsx
/**
 * KO402 CLI Agent
 * 
 * Run two of these in separate terminals to fight:
 *   Terminal 1: npx tsx scripts/agent.ts --name "Ronin" --fighter samurai --wallet 1
 *   Terminal 2: npx tsx scripts/agent.ts --name "Shadow" --fighter kenji --wallet 2
 * 
 * Each agent:
 *   1. Joins the lobby
 *   2. Deposits 0.1 USDC to the pot (real Stellar tx)
 *   3. Each turn: asks GPT for move → pays USDC → submits move
 *   4. Polls game state for opponent's moves
 *   5. Winner gets pot settlement
 */

import 'dotenv/config';

const SERVER = process.env.GAME_SERVER || 'http://localhost:4000';

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
}

const AGENT_NAME = getArg('name', 'Agent-' + Math.floor(Math.random() * 1000));
const FIGHTER = getArg('fighter', 'samurai');
const WALLET_NUM = getArg('wallet', '1'); // 1 or 2

// Get wallet from env based on --wallet flag
const walletPublic = WALLET_NUM === '2'
  ? (process.env.AGENT2_STELLAR_PUBLIC || 'GBYG4FCBBDTCIGPU7IIRMSHO3T7TQSA2KPU5ZRA3XYYFYRBMULN7NJ3D')
  : (process.env.AGENT1_STELLAR_PUBLIC || 'GABCOE5R6P2NIGZ7RN5AHKRBO7AAEMHOMJU3U54TXNAFPIY72ZKNROKF');

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(msg: string) { console.log(`${COLORS.dim}[${new Date().toLocaleTimeString()}]${COLORS.reset} ${msg}`); }
function logBold(msg: string) { console.log(`\n${COLORS.bold}${msg}${COLORS.reset}`); }

async function api(path: string, method = 'GET', body?: any) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SERVER}${path}`, opts);
  return res.json();
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`
${COLORS.yellow}╔══════════════════════════════════════╗
║       ${COLORS.bold}KO402 — CLI AGENT${COLORS.reset}${COLORS.yellow}              ║
║    Pay-Per-Move Fighting on Stellar  ║
╚══════════════════════════════════════╝${COLORS.reset}
`);

  log(`Agent: ${COLORS.bold}${AGENT_NAME}${COLORS.reset}`);
  log(`Fighter: ${COLORS.cyan}${FIGHTER}${COLORS.reset}`);
  log(`Wallet: ${COLORS.blue}${walletPublic.slice(0, 8)}...${walletPublic.slice(-4)}${COLORS.reset}`);
  log(`Server: ${COLORS.dim}${SERVER}${COLORS.reset}`);
  log(`Wallet slot: ${WALLET_NUM} (uses AGENT${WALLET_NUM}_STELLAR_SECRET on server)`);

  // 1. Join lobby
  logBold('⏳ Joining arena...');
  const joinResult = await api('/api/game/lobby', 'POST', {
    wallet: walletPublic,
    fighter: FIGHTER,
    name: AGENT_NAME,
  });

  if (joinResult.error) {
    log(`${COLORS.red}✗ Failed to join: ${joinResult.error}${COLORS.reset}`);
    // Try resetting and rejoining
    log('Resetting room...');
    await api('/api/game/lobby', 'DELETE');
    const retry = await api('/api/game/lobby', 'POST', {
      wallet: walletPublic, fighter: FIGHTER, name: AGENT_NAME,
    });
    if (retry.error) {
      log(`${COLORS.red}✗ Still failed: ${retry.error}${COLORS.reset}`);
      process.exit(1);
    }
    log(`${COLORS.green}✓ Joined as ${retry.slot}${COLORS.reset}`);
  } else {
    log(`${COLORS.green}✓ Joined as ${joinResult.slot}${COLORS.reset}`);
  }

  // 2. Deposit pot
  logBold('💰 Depositing 0.1 USDC to pot...');
  const depositResult = await api('/api/game/deposit', 'POST', {
    agentNum: parseInt(WALLET_NUM),
  });
  if (depositResult.success) {
    log(`${COLORS.green}✓ Deposited! TX: ${depositResult.deposit.hash.slice(0, 16)}...${COLORS.reset}`);
    log(`  ${COLORS.blue}↗ ${depositResult.deposit.explorerUrl}${COLORS.reset}`);
  } else {
    log(`${COLORS.yellow}⚠ Deposit failed: ${depositResult.error || 'unknown'} (continuing anyway)${COLORS.reset}`);
  }

  // 3. Wait for opponent
  logBold('⏳ Waiting for opponent...');
  let state = await api('/api/game/state');
  while (state.status === 'waiting' || state.status === 'empty') {
    process.stdout.write('.');
    await sleep(1500);
    state = await api('/api/game/state');
  }
  console.log('');

  if (state.status === 'fighting') {
    log(`${COLORS.green}✓ FIGHT! ${state.p1?.name} vs ${state.p2?.name}${COLORS.reset}`);
    log(`  P1: ${state.p1?.fighter} (${state.p1?.wallet?.slice(0, 8)}...)`);
    log(`  P2: ${state.p2?.fighter} (${state.p2?.wallet?.slice(0, 8)}...)`);
    log(`  Pot: ${state.pot} USDC`);
  }

  // 4. Fight loop
  let lastTurn = state.turn;
  let myHp = 100;
  let opponentHp = 100;
  let myBalance = 1.0;
  let opponentBalance = 1.0;
  let lastOpponentMove: string | null = null;
  let lastMyMove: string | null = null;

  while (state.status === 'fighting') {
    // Wait for turn updates
    state = await api('/api/game/state');
    
    // Update HP/balance from state
    const isP1 = state.p1?.wallet === walletPublic;
    const me = isP1 ? state.p1 : state.p2;
    const opp = isP1 ? state.p2 : state.p1;
    myHp = me?.hp || 0;
    opponentHp = opp?.hp || 0;
    myBalance = me?.balance || 0;
    opponentBalance = opp?.balance || 0;

    if (state.status === 'ko') break;

    // Ask GPT for move
    log(`${COLORS.magenta}🧠 GPT thinking... (HP: ${myHp}/${opponentHp}, Balance: ${myBalance.toFixed(3)}/${opponentBalance.toFixed(3)})${COLORS.reset}`);
    const thinkResult = await api('/api/game/think', 'POST', {
      myHp, opponentHp, myBalance, opponentBalance,
      myChar: FIGHTER,
      opponentChar: (isP1 ? state.p2?.fighter : state.p1?.fighter) || 'unknown',
      roundNum: state.turn,
      timeLeft: 60 - state.turn * 2,
      lastOpponentMove,
      myLastMove: lastMyMove,
    });

    const move = thinkResult.move || 'light';
    const reasoning = thinkResult.reasoning || '';
    log(`${COLORS.magenta}🧠 Chose: ${COLORS.bold}${move.toUpperCase()}${COLORS.reset} — ${COLORS.dim}${reasoning}${COLORS.reset}`);

    // Pay for move — real Stellar tx
    const costs: Record<string, string> = { light: '0.01', heavy: '0.05', block: '0.005' };
    log(`${COLORS.green}💸 Paying ${costs[move]} USDC on Stellar...${COLORS.reset}`);
    const moveTx = await api('/api/game/move', 'POST', {
      agentNum: parseInt(WALLET_NUM),
      moveType: move,
    });

    let txHash = '';
    let explorerUrl = '';
    if (moveTx.success) {
      txHash = moveTx.tx.hash;
      explorerUrl = moveTx.tx.explorerUrl;
      log(`${COLORS.green}✓ Paid! TX: ${txHash.slice(0, 20)}...${COLORS.reset}`);
      log(`  ${COLORS.blue}↗ ${explorerUrl}${COLORS.reset}`);
    } else {
      log(`${COLORS.red}✗ Payment failed: ${moveTx.error || moveTx.details || 'unknown'}${COLORS.reset}`);
    }

    // Submit move to game state
    const playResult = await api('/api/game/play', 'POST', {
      wallet: walletPublic,
      move,
      txHash,
      explorerUrl,
      reasoning,
    });

    if (playResult.success) {
      const dmgEntry = state.txLog?.slice(-1)[0];
      log(`${COLORS.yellow}⚔️  ${AGENT_NAME} → ${move.toUpperCase()} | Opponent HP: ${playResult.p2?.hp || playResult.p1?.hp}${COLORS.reset}`);
    }

    lastMyMove = move;

    // Check for opponent's last move
    state = await api('/api/game/state');
    const oppMoves = state.txLog?.filter((t: any) => t.agent !== AGENT_NAME);
    if (oppMoves?.length > 0) {
      const lastOpp = oppMoves[oppMoves.length - 1];
      lastOpponentMove = lastOpp.move;
      if (lastOpp.agent !== AGENT_NAME) {
        log(`${COLORS.red}🗡️  ${lastOpp.agent} → ${lastOpp.move.toUpperCase()} | ${lastOpp.dmg} dmg${COLORS.reset}`);
      }
    }

    if (state.status === 'ko') break;

    // Brief pause before next turn
    await sleep(800);
  }

  // 5. Game over
  state = await api('/api/game/state');
  console.log('');
  logBold(`${'═'.repeat(40)}`);

  if (state.winner === AGENT_NAME) {
    logBold(`${COLORS.green}🏆 ${AGENT_NAME} WINS! +${state.pot} USDC${COLORS.reset}`);
  } else {
    logBold(`${COLORS.red}💀 ${AGENT_NAME} LOST. Winner: ${state.winner}${COLORS.reset}`);
  }

  log(`Final HP — ${state.p1?.name}: ${state.p1?.hp} | ${state.p2?.name}: ${state.p2?.hp}`);
  log(`Total moves: ${state.txLog?.length || 0}`);
  log(`Onchain TXs: ${state.txLog?.filter((t: any) => t.hash).length || 0}`);

  logBold(`${'═'.repeat(40)}`);
}

main().catch(err => {
  console.error(`${COLORS.red}Fatal: ${err.message}${COLORS.reset}`);
  process.exit(1);
});
