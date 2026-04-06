#!/usr/bin/env npx tsx
/**
 * KO402 CLI Agent — Turn-based fighting on Stellar
 * 
 * Terminal 1: npx tsx scripts/agent.ts --name "Ronin" --fighter samurai --wallet 1
 * Terminal 2: npx tsx scripts/agent.ts --name "Shadow" --fighter kenji --wallet 2
 */

import 'dotenv/config';

const SERVER = process.env.GAME_SERVER || 'https://ko402.vercel.app';

const args = process.argv.slice(2);
function getArg(name: string, fb: string): string {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fb;
}

const NAME = getArg('name', 'Agent-' + Math.floor(Math.random() * 1000));
const FIGHTER = getArg('fighter', 'samurai');
const WNUM = getArg('wallet', '1');
const MY_SLOT = WNUM === '2' ? 'p2' : 'p1';

const walletPublic = WNUM === '2'
  ? (process.env.AGENT2_STELLAR_PUBLIC || 'GBYG4FCBBDTCIGPU7IIRMSHO3T7TQSA2KPU5ZRA3XYYFYRBMULN7NJ3D')
  : (process.env.AGENT1_STELLAR_PUBLIC || 'GABCOE5R6P2NIGZ7RN5AHKRBO7AAEMHOMJU3U54TXNAFPIY72ZKNROKF');

const C = { r:'\x1b[0m', b:'\x1b[1m', d:'\x1b[2m', red:'\x1b[31m', grn:'\x1b[32m', yel:'\x1b[33m', blu:'\x1b[34m', mag:'\x1b[35m', cyn:'\x1b[36m' };
function log(m: string) { console.log(`${C.d}[${new Date().toLocaleTimeString()}]${C.r} ${m}`); }

async function api(path: string, method = 'GET', body?: any) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${SERVER}${path}`, opts);
  return res.json();
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\n${C.yel}╔══════════════════════════════════════╗
║       ${C.b}KO402 — CLI AGENT${C.r}${C.yel}              ║
║    Pay-Per-Move Fighting on Stellar  ║
╚══════════════════════════════════════╝${C.r}\n`);

  log(`Agent: ${C.b}${NAME}${C.r} | Fighter: ${C.cyn}${FIGHTER}${C.r} | Slot: ${MY_SLOT}`);
  log(`Wallet: ${C.blu}${walletPublic.slice(0, 8)}...${walletPublic.slice(-4)}${C.r}`);
  log(`Server: ${C.d}${SERVER}${C.r}`);

  // 1. Join lobby
  log(`${C.yel}⏳ Joining arena...${C.r}`);
  let joinResult = await api('/api/game/lobby', 'POST', { wallet: walletPublic, fighter: FIGHTER, name: NAME });
  if (joinResult.error) {
    log('Resetting stale room...');
    await api('/api/game/lobby', 'DELETE');
    joinResult = await api('/api/game/lobby', 'POST', { wallet: walletPublic, fighter: FIGHTER, name: NAME });
  }
  if (joinResult.error) { log(`${C.red}✗ ${joinResult.error}${C.r}`); process.exit(1); }
  log(`${C.grn}✓ Joined as ${joinResult.slot}${C.r}`);

  // 2. Deposit pot
  log(`${C.yel}💰 Depositing 0.1 USDC...${C.r}`);
  const dep = await api('/api/game/deposit', 'POST', { agentNum: parseInt(WNUM) });
  if (dep.success) {
    log(`${C.grn}✓ Deposit TX: ${dep.deposit.hash.slice(0, 20)}...${C.r}`);
    log(`  ${C.blu}↗ ${dep.deposit.explorerUrl}${C.r}`);
  } else {
    log(`${C.yel}⚠ Deposit: ${dep.error || 'failed'}${C.r}`);
  }

  // 3. Wait for opponent
  log(`${C.yel}⏳ Waiting for opponent...${C.r}`);
  let state = await api('/api/game/state');
  while (state.status === 'waiting' || state.status === 'empty') {
    process.stdout.write('.');
    await sleep(1500);
    state = await api('/api/game/state');
  }
  console.log('');
  log(`${C.grn}✓ FIGHT! ${state.p1?.name} vs ${state.p2?.name} | Pot: ${state.pot} USDC${C.r}`);

  // 4. Turn-based fight loop
  let lastMyMove: string | null = null;
  let lastOppMove: string | null = null;

  while (true) {
    state = await api('/api/game/state');
    if (state.status === 'ko' || state.status === 'empty') break;

    // Wait for my turn
    if (state.currentTurn !== MY_SLOT) {
      await sleep(500);
      continue;
    }

    const isP1 = MY_SLOT === 'p1';
    const me = isP1 ? state.p1 : state.p2;
    const opp = isP1 ? state.p2 : state.p1;

    // Check opponent's last move
    const oppMoves = (state.txLog || []).filter((t: any) => t.agent !== NAME);
    if (oppMoves.length > 0) {
      const last = oppMoves[oppMoves.length - 1];
      if (last.move !== lastOppMove || oppMoves.length > 1) {
        log(`${C.red}🗡️  ${last.agent} → ${last.move.toUpperCase()}${last.dmg > 0 ? ` ${last.dmg}dmg` : ''}${C.r}`);
        lastOppMove = last.move;
      }
    }

    // Think via GPT
    log(`${C.mag}🧠 Thinking... (HP: ${me?.hp}/${opp?.hp}, Bal: ${me?.balance?.toFixed(3)}/${opp?.balance?.toFixed(3)})${C.r}`);
    const think = await api('/api/game/think', 'POST', {
      myHp: me?.hp || 0, opponentHp: opp?.hp || 0,
      myBalance: me?.balance || 0, opponentBalance: opp?.balance || 0,
      myChar: FIGHTER, opponentChar: opp?.fighter || 'unknown',
      roundNum: state.turn, timeLeft: 60 - state.turn * 2,
      lastOpponentMove: lastOppMove, myLastMove: lastMyMove,
    });

    const move = think.move || 'light';
    log(`${C.mag}🧠 Chose: ${C.b}${move.toUpperCase()}${C.r} ${C.d}— ${think.reasoning || ''}${C.r}`);

    // Pay on Stellar
    const costs: Record<string, string> = { light: '0.01', heavy: '0.05', block: '0.005' };
    log(`${C.grn}💸 Paying ${costs[move]} USDC...${C.r}`);
    const moveTx = await api('/api/game/move', 'POST', { agentNum: parseInt(WNUM), moveType: move });
    
    let txHash = '', explorerUrl = '';
    if (moveTx.success) {
      txHash = moveTx.tx.hash;
      explorerUrl = moveTx.tx.explorerUrl;
      log(`${C.grn}✓ TX: ${txHash.slice(0, 24)}...${C.r}`);
      log(`  ${C.blu}↗ ${explorerUrl}${C.r}`);
    } else {
      log(`${C.red}✗ Payment: ${moveTx.error || 'failed'}${C.r}`);
    }

    // Submit move to game state
    const play = await api('/api/game/play', 'POST', { wallet: walletPublic, move, txHash, explorerUrl, reasoning: think.reasoning });
    
    if (play.success) {
      const myState = isP1 ? play.p1 : play.p2;
      const oppState = isP1 ? play.p2 : play.p1;
      log(`${C.yel}⚔️  ${NAME} → ${move.toUpperCase()} | Opp HP: ${oppState?.hp}${C.r}`);
    } else {
      log(`${C.red}✗ Submit: ${play.error}${C.r}`);
    }

    lastMyMove = move;
    await sleep(300);
  }

  // 5. Game over
  state = await api('/api/game/state');
  console.log(`\n${C.b}${'═'.repeat(40)}${C.r}`);
  if (state.winner === NAME) {
    console.log(`${C.grn}${C.b}🏆 ${NAME} WINS! +${state.pot} USDC${C.r}`);
  } else if (state.winner) {
    console.log(`${C.red}${C.b}💀 ${NAME} LOST. Winner: ${state.winner}${C.r}`);
  } else {
    console.log(`${C.yel}Game ended. Status: ${state.status}${C.r}`);
  }
  log(`Final: ${state.p1?.name} HP:${state.p1?.hp} | ${state.p2?.name} HP:${state.p2?.hp}`);
  log(`Moves: ${state.txLog?.length || 0} | Onchain: ${state.txLog?.filter((t: any) => t.hash).length || 0}`);
  console.log(`${C.b}${'═'.repeat(40)}${C.r}\n`);
}

main().catch(e => { console.error(`${C.red}Fatal: ${e.message}${C.r}`); process.exit(1); });
