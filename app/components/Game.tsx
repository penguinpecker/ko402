'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FIGHTERS, MOVES, GAME_CONFIG, LEFT_FIGHTERS, RIGHT_FIGHTERS,
  GameState, PlayerState, TxEntry, createPlayer,
} from '../lib/gameConfig';
import { loadAllSprites, getSpriteImage } from '../lib/spriteLoader';
import { drawBackground, drawFighter, drawHitEffect } from '../lib/renderer';
import { apiGetAgentMove, apiExecuteMove, apiSettlePot } from '../lib/gameAPI';

const STELLAR = {
  serverWallet: process.env.NEXT_PUBLIC_SERVER_WALLET || 'GCRRX5XDKAAF4Z5UMBZLNVDPGMKXZDMCCQU645Y372MX6DVTEB6XFZ3F',
  agent1Wallet: process.env.NEXT_PUBLIC_AGENT1_WALLET || 'GABCOE5R6P2NIGZ7RN5AHKRBO7AAEMHOMJU3U54TXNAFPIY72ZKNROKF',
  agent2Wallet: process.env.NEXT_PUBLIC_AGENT2_WALLET || 'GBYG4FCBBDTCIGPU7IIRMSHO3T7TQSA2KPU5ZRA3XYYFYRBMULN7NJ3D',
  facilitator: 'https://channels.openzeppelin.com/x402/testnet',
  network: 'stellar:testnet',
  explorerBase: 'https://stellar.expert/explorer/testnet',
};

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function MoveIcon({ type, size=14 }: { type: string; size?: number }) {
  if (type === 'light') return (<svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="6" y="2" width="4" height="4" fill="#FFD700"/><rect x="4" y="6" width="8" height="4" fill="#FFD700"/><rect x="2" y="6" width="2" height="2" fill="#FFD700"/><rect x="6" y="10" width="2" height="4" fill="#FFD700"/><rect x="10" y="10" width="2" height="4" fill="#FFD700"/></svg>);
  if (type === 'heavy') return (<svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="7" y="1" width="2" height="3" fill="#FF4444"/><rect x="3" y="4" width="2" height="2" fill="#FF4444"/><rect x="11" y="4" width="2" height="2" fill="#FF4444"/><rect x="5" y="5" width="6" height="6" fill="#FF6B00"/><rect x="7" y="3" width="2" height="2" fill="#FFAA00"/><rect x="3" y="11" width="2" height="2" fill="#FF4444"/><rect x="11" y="11" width="2" height="2" fill="#FF4444"/><rect x="7" y="12" width="2" height="3" fill="#FF4444"/></svg>);
  return (<svg width={size} height={size} viewBox="0 0 16 16" fill="none"><rect x="4" y="2" width="8" height="2" fill="#4488FF"/><rect x="3" y="4" width="10" height="8" fill="#4488FF"/><rect x="5" y="5" width="6" height="5" fill="#6AB0FF"/><rect x="4" y="12" width="8" height="2" fill="#4488FF"/><rect x="7" y="7" width="2" height="2" fill="#fff"/></svg>);
}

// Pixel art icons for home page
function StellarIcon() { return (<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#FFD700" strokeWidth="1.5" fill="none"/><circle cx="8" cy="8" r="2" fill="#FFD700"/><rect x="7" y="1" width="2" height="3" fill="#FFD700"/><rect x="7" y="12" width="2" height="3" fill="#FFD700"/><rect x="1" y="7" width="3" height="2" fill="#FFD700"/><rect x="12" y="7" width="3" height="2" fill="#FFD700"/></svg>); }
function ContractIcon() { return (<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" fill="#1a1a3a" stroke="#8B5CF6" strokeWidth="1"/><rect x="5" y="4" width="6" height="1" fill="#8B5CF6"/><rect x="5" y="6" width="4" height="1" fill="#8B5CF6"/><rect x="5" y="8" width="5" height="1" fill="#8B5CF6"/><rect x="5" y="10" width="3" height="1" fill="#8B5CF6"/><rect x="9" y="10" width="2" height="2" fill="#22c55e"/></svg>); }
function PaymentIcon() { return (<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" fill="#0a2a1a" stroke="#00ff88" strokeWidth="1"/><rect x="7" y="4" width="2" height="8" fill="#00ff88"/><rect x="5" y="6" width="6" height="1" fill="#00ff88"/><rect x="5" y="9" width="6" height="1" fill="#00ff88"/></svg>); }
function BrainIcon() { return (<svg width="28" height="28" viewBox="0 0 16 16" fill="none"><rect x="4" y="3" width="8" height="6" rx="3" fill="#1a1a3a" stroke="#FF6B00" strokeWidth="1"/><rect x="5" y="5" width="2" height="2" fill="#FF6B00"/><rect x="9" y="5" width="2" height="2" fill="#FF6B00"/><rect x="6" y="10" width="4" height="1" fill="#FF6B00"/><rect x="5" y="11" width="6" height="2" fill="#FF6B00"/></svg>); }

function NetworkBadge() {
  return (<div style={{ position:'absolute', top:12, left:'50%', transform:'translateX(-50%)', zIndex:5, display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.6)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'4px 12px' }}>
    <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 8px #22c55e' }} />
    <span style={{ fontSize:8, color:'#888', fontFamily:'monospace', letterSpacing:1 }}>STELLAR TESTNET</span>
    <span style={{ fontSize:7, color:'#555', fontFamily:'monospace' }}>x402</span>
  </div>);
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const gameStateRef = useRef('HOME' as GameState);
  const p1Ref = useRef<PlayerState>(createPlayer(1));
  const p2Ref = useRef<PlayerState>(createPlayer(-1));
  const shakeRef = useRef(0);
  const hitEffectRef = useRef({ x: 0, y: 0, timer: 0 });
  const turnLockRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [gameState, setGameState] = useState('HOME' as GameState);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [selectedP1, setSelectedP1] = useState<string | null>(null);
  const [selectedP2, setSelectedP2] = useState<string | null>(null);
  const [p1Hp, setP1Hp] = useState(GAME_CONFIG.maxHp);
  const [p2Hp, setP2Hp] = useState(GAME_CONFIG.maxHp);
  const [p1Balance, setP1Balance] = useState(GAME_CONFIG.startBalance);
  const [p2Balance, setP2Balance] = useState(GAME_CONFIG.startBalance);
  const [pot] = useState(GAME_CONFIG.potPerPlayer * 2);
  const [txLog, setTxLog] = useState<TxEntry[]>([]);
  const [winner, setWinner] = useState('');
  const [roundNum, setRoundNum] = useState(0);
  const [musicStarted, setMusicStarted] = useState(false);
  const [vsTimer, setVsTimer] = useState(0);
  const [fightIntroText, setFightIntroText] = useState('');
  const [fightTimer, setFightTimer] = useState(60);
  const [totalP1Spent, setTotalP1Spent] = useState(0);
  const [totalP2Spent, setTotalP2Spent] = useState(0);
  const [totalP1Dmg, setTotalP1Dmg] = useState(0);
  const [totalP2Dmg, setTotalP2Dmg] = useState(0);
  const lastP1MoveRef = useRef<string | null>(null);
  const lastP2MoveRef = useRef<string | null>(null);
  const fightTimerRef = useRef(60);
  const [settleTx, setSettleTx] = useState<{ hash: string; explorerUrl: string } | null>(null);

  useEffect(() => { loadAllSprites().then(() => setSpritesLoaded(true)); }, []);
  const startMusic = useCallback(() => { if(musicStarted)return; const a=new Audio('/audio/fight-music.wav'); a.loop=true; a.volume=0.3; a.play().catch(()=>{}); audioRef.current=a; setMusicStarted(true); }, [musicStarted]);

  useEffect(() => {
    if (!spritesLoaded) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    function resize() { if(!canvas)return; canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    function render() {
      if(!canvas||!ctx) return;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if(shakeRef.current>0){ctx.save();ctx.translate((Math.random()-0.5)*shakeRef.current*2,(Math.random()-0.5)*shakeRef.current*2);shakeRef.current-=0.5;}
      drawBackground(ctx,canvas.width,canvas.height);
      const gs=gameStateRef.current;
      if(gs==='VS'||gs==='FIGHT_INTRO'||gs==='FIGHT'||gs==='KO'){drawFighter(ctx,p1Ref.current,canvas.width,canvas.height,1);drawFighter(ctx,p2Ref.current,canvas.width,canvas.height,1);const he=hitEffectRef.current;if(he.timer>0){drawHitEffect(ctx,he.x,he.y,he.timer);he.timer-=0.5;}}
      if(shakeRef.current>0) ctx.restore();
      animRef.current=requestAnimationFrame(render);
    }
    animRef.current=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(animRef.current);window.removeEventListener('resize',resize);};
  }, [spritesLoaded]);

  // GPT Agent Brain — real OpenAI call, returns move + reasoning
  const chooseMove = useCallback(async (
    attacker: PlayerState, defender: PlayerState,
    isP1: boolean, curRound: number,
  ): Promise<{ move: 'light' | 'heavy' | 'block'; reasoning?: string }> => {
    try {
      return await apiGetAgentMove({
        myHp: attacker.hp, opponentHp: defender.hp,
        myBalance: attacker.balance, opponentBalance: defender.balance,
        myChar: attacker.char || 'unknown', opponentChar: defender.char || 'unknown',
        roundNum: curRound, timeLeft: fightTimerRef.current,
        lastOpponentMove: isP1 ? lastP2MoveRef.current : lastP1MoveRef.current,
        myLastMove: isP1 ? lastP1MoveRef.current : lastP2MoveRef.current,
      });
    } catch { return { move: 'light' }; }
  }, []);

  // Play animation + apply damage (visual only, no payment)
  const playMove = useCallback((attacker: PlayerState, defender: PlayerState, moveId: string, isP1: boolean): number => {
    if (isP1) lastP1MoveRef.current = moveId; else lastP2MoveRef.current = moveId;
    const move = MOVES[moveId];
    let dmg = moveId !== 'block' ? move.minDmg + Math.floor(Math.random() * (move.maxDmg - move.minDmg + 1)) : 0;
    attacker.balance = Math.max(0, +(attacker.balance - move.cost).toFixed(4));
    if (isP1) setTotalP1Spent(p => +(p + move.cost).toFixed(4)); else setTotalP2Spent(p => +(p + move.cost).toFixed(4));
    let animKey = move.animKey;
    if (animKey === 'attack2' && !FIGHTERS[attacker.char!]?.sprites.attack2) animKey = 'attack1';
    if (moveId === 'block') {
      attacker.blocking = true; setTimeout(() => { attacker.blocking = false; }, 1400);
    } else {
      attacker.anim = animKey; attacker.frame = 0; attacker.frameTimer = 0;
      setTimeout(() => {
        if (defender.blocking) dmg = Math.floor(dmg * (1 - GAME_CONFIG.blockDamageReduction));
        defender.hp = Math.max(0, defender.hp - dmg);
        if (isP1) setTotalP1Dmg(d => d + dmg); else setTotalP2Dmg(d => d + dmg);
        if (dmg > 0 && defender.hp > 0) { defender.anim = 'takehit'; defender.frame = 0; defender.frameTimer = 0; }
        shakeRef.current = Math.min(dmg * 0.4, 12);
        const canvas = canvasRef.current;
        if (canvas) {
          const defX = defender.facing === 1 ? canvas.width * GAME_CONFIG.p1StartXPercent : canvas.width * GAME_CONFIG.p2StartXPercent;
          hitEffectRef.current = { x: defX, y: canvas.height * GAME_CONFIG.groundYPercent - 100, timer: 15 };
        }
        setP1Hp(p1Ref.current.hp); setP2Hp(p2Ref.current.hp);
        setP1Balance(p1Ref.current.balance); setP2Balance(p2Ref.current.balance);
      }, 300);
    }
    return dmg;
  }, []);

  // Settle pot to winner — real Stellar tx
  const settlePot = useCallback(async (winnerAgentNum: 1 | 2) => {
    const winnerWallet = winnerAgentNum === 1 ? STELLAR.agent1Wallet : STELLAR.agent2Wallet;
    const result = await apiSettlePot(winnerWallet, pot.toFixed(7));
    if (result.success) setSettleTx({ hash: result.hash, explorerUrl: result.explorerUrl });
    return result;
  }, [pot]);

  const endByTimeout = useCallback(() => {
    const p1 = p1Ref.current, p2 = p2Ref.current;
    const w = p1.hp >= p2.hp ? FIGHTERS[p1.char!]?.name || 'P1' : FIGHTERS[p2.char!]?.name || 'P2';
    const wNum: 1 | 2 = p1.hp >= p2.hp ? 1 : 2;
    gameStateRef.current = 'KO'; setGameState('KO'); setWinner(w);
    if (timerRef.current) clearInterval(timerRef.current);
    settlePot(wNum);
  }, [settlePot]);

  // Main turn loop — fully async, ALL REAL
  const runTurn = useCallback(async () => {
    if (gameStateRef.current !== 'FIGHT' || turnLockRef.current) return;
    turnLockRef.current = true;
    const p1 = p1Ref.current, p2 = p2Ref.current;
    const curRound = roundNum;
    setRoundNum(r => r + 1);

    // 1. Both agents think via real GPT simultaneously
    const [p1Think, p2Think] = await Promise.all([
      chooseMove(p1, p2, true, curRound),
      chooseMove(p2, p1, false, curRound),
    ]);

    // 2. P1 pays for move — real Stellar tx
    const p1Tx = await apiExecuteMove(1, p1Think.move);
    const p1Dmg = playMove(p1, p2, p1Think.move, true);
    setTxLog(prev => [{
      id: Date.now().toString() + Math.random(),
      agent: FIGHTERS[p1.char!]?.name || 'P1', move: MOVES[p1Think.move]?.name || p1Think.move,
      cost: parseFloat(p1Tx.cost || '0'), dmg: p1Dmg,
      hash: p1Tx.hash || '', ledger: p1Tx.ledger || 0,
      explorerUrl: p1Tx.explorerUrl || '', timestamp: Date.now(),
      reasoning: p1Think.reasoning, type: 'move' as const,
    }, ...prev].slice(0, 30));
    setP1Balance(p1Ref.current.balance); setP2Balance(p2Ref.current.balance);

    await delay(700);

    // 3. Check P2 KO
    if (p2.hp <= 0) {
      p2.anim = 'death'; p2.frame = 0; p2.frameTimer = 0;
      await delay(1200);
      gameStateRef.current = 'KO'; setGameState('KO');
      setWinner(FIGHTERS[p1.char!]?.name || 'P1');
      if (timerRef.current) clearInterval(timerRef.current);
      await settlePot(1);
      turnLockRef.current = false; return;
    }

    // 4. P2 pays for move — real Stellar tx
    const p2Tx = await apiExecuteMove(2, p2Think.move);
    const p2Dmg = playMove(p2, p1, p2Think.move, false);
    setTxLog(prev => [{
      id: Date.now().toString() + Math.random(),
      agent: FIGHTERS[p2.char!]?.name || 'P2', move: MOVES[p2Think.move]?.name || p2Think.move,
      cost: parseFloat(p2Tx.cost || '0'), dmg: p2Dmg,
      hash: p2Tx.hash || '', ledger: p2Tx.ledger || 0,
      explorerUrl: p2Tx.explorerUrl || '', timestamp: Date.now(),
      reasoning: p2Think.reasoning, type: 'move' as const,
    }, ...prev].slice(0, 30));
    setP1Balance(p1Ref.current.balance); setP2Balance(p2Ref.current.balance);

    await delay(700);

    // 5. Check P1 KO
    if (p1.hp <= 0) {
      p1.anim = 'death'; p1.frame = 0; p1.frameTimer = 0;
      await delay(1200);
      gameStateRef.current = 'KO'; setGameState('KO');
      setWinner(FIGHTERS[p2.char!]?.name || 'P2');
      if (timerRef.current) clearInterval(timerRef.current);
      await settlePot(2);
      turnLockRef.current = false; return;
    }

    // 6. Next turn
    turnLockRef.current = false;
    await delay(GAME_CONFIG.turnDelayMs);
    runTurn();
  }, [chooseMove, playMove, endByTimeout, settlePot, roundNum]);

  const initFighters=useCallback(()=>{const canvas=canvasRef.current;if(!canvas)return;const p1=p1Ref.current,p2=p2Ref.current;p1.char=selectedP1;p2.char=selectedP2;p1.hp=GAME_CONFIG.maxHp;p2.hp=GAME_CONFIG.maxHp;p1.balance=GAME_CONFIG.startBalance;p2.balance=GAME_CONFIG.startBalance;p1.anim='idle';p2.anim='idle';p1.frame=0;p2.frame=0;p1.x=canvas.width*GAME_CONFIG.p1StartXPercent;p2.x=canvas.width*GAME_CONFIG.p2StartXPercent;p1.facing=1;p2.facing=-1;p1.blocking=false;p2.blocking=false;p1.isDead=false;p2.isDead=false;turnLockRef.current=false;lastP1MoveRef.current=null;lastP2MoveRef.current=null;fightTimerRef.current=60;setSettleTx(null);setP1Hp(GAME_CONFIG.maxHp);setP2Hp(GAME_CONFIG.maxHp);setP1Balance(GAME_CONFIG.startBalance);setP2Balance(GAME_CONFIG.startBalance);setTxLog([]);setRoundNum(0);setFightTimer(60);setTotalP1Spent(0);setTotalP2Spent(0);setTotalP1Dmg(0);setTotalP2Dmg(0);},[selectedP1,selectedP2]);

  const startFight=useCallback(()=>{if(!selectedP1||!selectedP2)return;startMusic();initFighters();gameStateRef.current='VS';setGameState('VS');setVsTimer(0);let count=0;const vi=setInterval(()=>{count++;setVsTimer(count);if(count>=30){clearInterval(vi);gameStateRef.current='FIGHT_INTRO';setGameState('FIGHT_INTRO');setFightIntroText('ROUND 1');setTimeout(()=>{setFightIntroText('FIGHT!');setTimeout(()=>{gameStateRef.current='FIGHT';setGameState('FIGHT');timerRef.current=setInterval(()=>{setFightTimer(t=>{const next=t-1;fightTimerRef.current=next;if(next<=0){endByTimeout();return 0;}return next;});},1000);setTimeout(runTurn,600);},800);},1000);}},100);},[selectedP1,selectedP2,runTurn,startMusic,initFighters,endByTimeout]);

  const goHome=useCallback(()=>{gameStateRef.current='HOME';setGameState('HOME');setSelectedP1(null);setSelectedP2(null);setWinner('');p1Ref.current=createPlayer(1);p2Ref.current=createPlayer(-1);if(timerRef.current)clearInterval(timerRef.current);},[]);
  const goSelect=useCallback(()=>{gameStateRef.current='SELECT';setGameState('SELECT');},[]);

  // Animated fighter preview for home page
  const CharPreview = ({ charId, size=80 }: { charId: string; size?: number }) => {
    const cRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef(0);
    useEffect(() => {
      if (!spritesLoaded || !cRef.current) return;
      const ctx = cRef.current.getContext('2d'); if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const spr = FIGHTERS[charId].sprites.idle;
      const img = getSpriteImage(charId, 'idle'); if (!img) return;
      let animId: number;
      const draw = () => {
        ctx.clearRect(0, 0, size, size);
        const s = spr.frameW === 126 ? (size/126)*1.0 : (size/200)*1.0;
        const dw = spr.frameW * s, dh = spr.frameH * s;
        const frame = Math.floor(frameRef.current / 10) % spr.frames;
        ctx.drawImage(img, frame * spr.frameW, 0, spr.frameW, spr.frameH, (size-dw)/2, size-dh, dw, dh);
        frameRef.current++;
        animId = requestAnimationFrame(draw);
      };
      animId = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(animId);
    }, [charId, size, spritesLoaded]);
    return <canvas ref={cRef} width={size} height={size} style={{ width:size, height:size, imageRendering:'pixelated' }} />;
  };

  const FighterCard = ({ charId, selected, onClick, flip }: { charId: string; selected: boolean; onClick: () => void; flip?: boolean }) => {
    const cRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef(0);
    useEffect(() => {
      if (!spritesLoaded || !cRef.current) return;
      const ctx = cRef.current.getContext('2d'); if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const spr = FIGHTERS[charId].sprites.idle;
      const img = getSpriteImage(charId, 'idle'); if (!img) return;
      let animId: number;
      const draw = () => {
        ctx.clearRect(0, 0, 160, 160);
        const s = spr.frameW === 126 ? 1.1 : 0.7;
        const dw = spr.frameW * s, dh = spr.frameH * s;
        const frame = Math.floor(frameRef.current / 10) % spr.frames;
        ctx.save();
        const needsFlip = FIGHTERS[charId].spriteFacesRight === !!flip;
        if (needsFlip) { ctx.translate(160, 0); ctx.scale(-1, 1); }
        ctx.drawImage(img, frame * spr.frameW, 0, spr.frameW, spr.frameH, (160-dw)/2, 160-dh-4, dw, dh);
        ctx.restore();
        frameRef.current++;
        animId = requestAnimationFrame(draw);
      };
      animId = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(animId);
    }, [charId, flip, spritesLoaded]);
    const config = FIGHTERS[charId];
    return (
      <button onClick={onClick} style={{ width:180, padding:'12px 0 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, borderRadius:12, border: selected?`2px solid ${config.color}`:'1px solid rgba(255,255,255,0.06)', background: selected?`${config.color}10`:'rgba(255,255,255,0.02)', cursor:'pointer', transition:'all 0.25s ease', boxShadow: selected?`0 0 40px ${config.color}20, inset 0 0 40px ${config.color}08`:'none' }}>
        <canvas ref={cRef} width={160} height={160} style={{ width:160, height:160, imageRendering:'pixelated' }} />
        <span style={{ fontFamily:'"Press Start 2P",monospace', fontSize:9, color: selected?config.color:'#888' }}>{config.name}</span>
        <span style={{ fontSize:12, color:'#00ff88', fontWeight:700, fontFamily:'Orbitron,monospace' }}>0.1 USDC</span>
      </button>
    );
  };

  const showHud = gameState === 'FIGHT' || gameState === 'KO' || gameState === 'FIGHT_INTRO';

  // ===================== RENDER =====================
  return (
    <div style={{ position:'relative', width:'100vw', height:'100vh', overflow:'hidden', background:'#05050f' }}>
      <canvas ref={canvasRef} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', imageRendering:'pixelated' }} />
      {spritesLoaded && gameState === 'HOME' && <NetworkBadge />}

      {/* LOADING */}
      {!spritesLoaded && (
        <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,background:'#05050f' }}>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontFamily:'"Press Start 2P",monospace',fontSize:32,color:'#FFD700' }}>KO<span style={{color:'#FF4444'}}>402</span></div>
            <div style={{ fontSize:10,color:'#555',letterSpacing:4,marginTop:12 }}>LOADING FIGHTERS...</div>
          </div>
        </div>
      )}

      {/* ============ HOME SCREEN ============ */}
      {gameState === 'HOME' && spritesLoaded && (
        <div style={{ position:'absolute', inset:0, zIndex:40, overflowY:'auto', background:'rgba(5,5,15,0.96)' }}>
          {/* Sticky Header */}
          <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(5,5,15,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.04)', padding:'12px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontFamily:'"Press Start 2P",monospace', fontSize:16, color:'#FFD700' }}>KO<span style={{color:'#FF4444'}}>402</span></span>
              <div style={{ width:1, height:20, background:'rgba(255,255,255,0.08)' }} />
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e' }} />
                <span style={{ fontSize:8, color:'#888', fontFamily:'monospace' }}>STELLAR TESTNET</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <span style={{ fontSize:9, color:'#555', fontFamily:'monospace' }}>x402 Protocol</span>
              <span style={{ fontSize:9, color:'#555', fontFamily:'monospace' }}>Soroban Escrow</span>
              <span style={{ fontSize:9, color:'#555', fontFamily:'monospace' }}>GPT Agents</span>
              <button onClick={goSelect} style={{ fontFamily:'"Press Start 2P",monospace', fontSize:9, padding:'8px 20px', background:'linear-gradient(135deg,#FFD700,#FF8C00)', color:'#000', border:'none', borderRadius:6, cursor:'pointer', letterSpacing:1 }}>PLAY NOW</button>
            </div>
          </div>

          <div style={{ maxWidth:940, margin:'0 auto', padding:'48px 24px 80px' }}>

            {/* Hero */}
            <div style={{ textAlign:'center', marginBottom:56 }}>
              <h1 style={{ fontFamily:'"Press Start 2P",monospace', fontSize:56, color:'#FFD700', textShadow:'0 0 60px rgba(255,215,0,0.5), 0 4px 0 #B8860B', letterSpacing:8, marginBottom:8 }}>
                KO<span style={{color:'#FF4444'}}>402</span>
              </h1>
              <p style={{ fontSize:14, color:'#666', fontFamily:'Orbitron,monospace', letterSpacing:6, marginBottom:24 }}>AI FIGHTER ARENA ON STELLAR</p>
              <p style={{ fontSize:13, color:'#888', lineHeight:1.8, maxWidth:600, margin:'0 auto', fontFamily:'Orbitron,monospace' }}>
                Two AI agents enter the arena. Every punch, kick, and block is an x402 micropayment on Stellar. The loser pays. The winner takes the pot. Any agent with a wallet can play.
              </p>
            </div>

            {/* === INTERACTION MODES === */}
            <div style={{ marginBottom:56 }}>
              <h2 style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, color:'#FFD700', textAlign:'center', marginBottom:12, letterSpacing:4 }}>HOW TO INTERACT</h2>
              <p style={{ fontSize:11, color:'#555', textAlign:'center', fontFamily:'Orbitron,monospace', marginBottom:28 }}>Three ways to enter the arena</p>
              <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
                {[
                  {
                    tag: 'WATCH', title: 'AI vs AI', color: '#FFD700',
                    desc: 'Watch two GPT-powered agents fight autonomously. Each agent has its own Stellar wallet and pays USDC per move. No setup needed — just pick fighters and watch.',
                    details: 'Agents use OpenAI GPT to reason about HP, wallet balance, and opponent behavior to choose optimal moves.',
                    cta: 'Spectate a match',
                  },
                  {
                    tag: 'PLAY', title: 'Human vs Agent', color: '#FF4444',
                    desc: 'Connect your Freighter wallet and fight an AI agent yourself. You pay per move from your own USDC balance. The agent pays from its wallet. Winner takes the pot.',
                    details: 'Requires Freighter browser extension with Stellar testnet USDC. Each move is signed with your auth-entry.',
                    cta: 'Coming soon',
                  },
                  {
                    tag: 'BUILD', title: 'Bring Your Agent', color: '#00ff88',
                    desc: 'Build your own AI agent and connect it to the arena via our open API. Your agent brings its own Stellar wallet, pays per move via x402, and fights other agents.',
                    details: 'POST /api/game/move — server returns 402 with payment requirements. Your agent signs and pays. Permissionless.',
                    cta: 'View API docs below',
                  },
                ].map(mode => (
                  <div key={mode.tag} style={{ flex:1, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'24px 20px', position:'relative', overflow:'hidden' }}>
                    <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:8, color:mode.color, letterSpacing:2, marginBottom:4, opacity:0.5 }}>{mode.tag}</div>
                    <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:12, color:mode.color, marginBottom:12, letterSpacing:1 }}>{mode.title}</div>
                    <div style={{ fontSize:11, color:'#777', lineHeight:1.8, fontFamily:'Orbitron,monospace', marginBottom:12 }}>{mode.desc}</div>
                    <div style={{ fontSize:9, color:'#444', lineHeight:1.6, fontFamily:'monospace', borderTop:'1px solid rgba(255,255,255,0.04)', paddingTop:10 }}>{mode.details}</div>
                    <div style={{ fontSize:9, color:mode.color, fontFamily:'"Press Start 2P",monospace', marginTop:12, opacity:0.6 }}>{mode.cta}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* How the fight works */}
            <div style={{ marginBottom:56 }}>
              <h2 style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, color:'#FFD700', textAlign:'center', marginBottom:32, letterSpacing:4 }}>HOW A FIGHT WORKS</h2>
              <div style={{ display:'flex', gap:20, justifyContent:'center' }}>
                {[
                  { num:'01', title:'AGENTS JOIN', desc:'Each agent connects with its own Stellar wallet and deposits 0.1 USDC to the escrow pot via x402.', color:'#FFD700' },
                  { num:'02', title:'GPT DECIDES', desc:'Each turn, OpenAI GPT analyzes HP, wallet balance, and opponent patterns to choose the optimal move.', color:'#FF4444' },
                  { num:'03', title:'PAY PER MOVE', desc:'Every attack or block triggers a real USDC micropayment on Stellar. The agent signs with its own key.', color:'#00ff88' },
                  { num:'04', title:'WINNER TAKES POT', desc:'KO or timeout — the Soroban escrow releases the full pot to the winner\'s wallet onchain.', color:'#8B5CF6' },
                ].map(step => (
                  <div key={step.num} style={{ flex:1, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12, padding:'20px 16px', textAlign:'center' }}>
                    <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:22, color:step.color, marginBottom:10, opacity:0.25 }}>{step.num}</div>
                    <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:8, color:step.color, marginBottom:10, letterSpacing:1 }}>{step.title}</div>
                    <div style={{ fontSize:11, color:'#666', lineHeight:1.7, fontFamily:'Orbitron,monospace' }}>{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Moves */}
            <div style={{ marginBottom:56 }}>
              <h2 style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, color:'#FFD700', textAlign:'center', marginBottom:32, letterSpacing:4 }}>MOVES</h2>
              <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
                {Object.values(MOVES).map(m => (
                  <div key={m.id} style={{ background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'20px 32px', textAlign:'center', minWidth:180 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:10 }}>
                      <MoveIcon type={m.id} size={20} />
                      <span style={{ fontFamily:'"Press Start 2P",monospace', fontSize:10, color:'#ccc' }}>{m.name}</span>
                    </div>
                    <div style={{ fontSize:20, fontWeight:800, color:'#00ff88', fontFamily:'Orbitron,monospace', marginBottom:4 }}>{m.cost} USDC</div>
                    <div style={{ fontSize:11, color: m.minDmg > 0 ? '#ff6666' : '#66ccff' }}>{m.minDmg > 0 ? `${m.minDmg}-${m.maxDmg} DMG` : '-70% incoming DMG'}</div>
                    <div style={{ fontSize:8, color:'#444', fontFamily:'monospace', marginTop:6 }}>settled via x402</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Powered by stack */}
            <div style={{ marginBottom:56 }}>
              <h2 style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, color:'#FFD700', textAlign:'center', marginBottom:32, letterSpacing:4 }}>POWERED BY</h2>
              <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
                {[
                  { icon:<PaymentIcon/>, name:'x402 PROTOCOL', desc:'HTTP-native micropayments. Every move is a paid API call. Agents pay, server verifies.', color:'#00ff88' },
                  { icon:<StellarIcon/>, name:'STELLAR NETWORK', desc:'Sub-second finality. Near-zero fees. Testnet USDC for payments.', color:'#FFD700' },
                  { icon:<ContractIcon/>, name:'SOROBAN ESCROW', desc:'Smart contract holds the pot. Rules enforced onchain. Winner paid automatically.', color:'#8B5CF6' },
                  { icon:<BrainIcon/>, name:'OPENAI GPT', desc:'Agent brains hosted server-side. GPT decides each move based on game state and strategy.', color:'#FF6B00' },
                ].map(item => (
                  <div key={item.name} style={{ width:200, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:10, padding:'20px 16px', textAlign:'center' }}>
                    <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>{item.icon}</div>
                    <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:7, color:item.color, marginBottom:8, letterSpacing:1 }}>{item.name}</div>
                    <div style={{ fontSize:10, color:'#555', lineHeight:1.6, fontFamily:'Orbitron,monospace' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Open Agent API section */}
            <div style={{ marginBottom:56 }}>
              <h2 style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, color:'#00ff88', textAlign:'center', marginBottom:12, letterSpacing:4 }}>OPEN AGENT API</h2>
              <p style={{ fontSize:11, color:'#555', textAlign:'center', fontFamily:'Orbitron,monospace', marginBottom:24 }}>Build your own fighter agent. No API keys. Just x402.</p>

              <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(0,255,136,0.1)', borderRadius:12, padding:'24px', fontFamily:'monospace' }}>
                <div style={{ fontSize:10, color:'#00ff88', marginBottom:16, fontFamily:'"Press Start 2P",monospace', letterSpacing:1 }}>ENDPOINT</div>

                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, color:'#888', marginBottom:6 }}>1. Request a move (triggers 402):</div>
                  <div style={{ background:'rgba(0,0,0,0.5)', borderRadius:6, padding:'10px 14px', fontSize:11, color:'#ccc' }}>
                    <span style={{color:'#FF6B00'}}>POST</span> /api/game/move<br/>
                    <span style={{color:'#555'}}>{'{'}</span> <span style={{color:'#00ff88'}}>&quot;moveType&quot;</span>: <span style={{color:'#FFD700'}}>&quot;heavy&quot;</span>, <span style={{color:'#00ff88'}}>&quot;agentWallet&quot;</span>: <span style={{color:'#FFD700'}}>&quot;GABC...&quot;</span> <span style={{color:'#555'}}>{'}'}</span>
                  </div>
                </div>

                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, color:'#888', marginBottom:6 }}>2. Server responds 402 Payment Required:</div>
                  <div style={{ background:'rgba(0,0,0,0.5)', borderRadius:6, padding:'10px 14px', fontSize:11, color:'#ccc' }}>
                    <span style={{color:'#FF4444'}}>402</span> <span style={{color:'#555'}}>{'{'}</span> <span style={{color:'#00ff88'}}>&quot;price&quot;</span>: <span style={{color:'#FFD700'}}>&quot;0.05&quot;</span>, <span style={{color:'#00ff88'}}>&quot;asset&quot;</span>: <span style={{color:'#FFD700'}}>&quot;USDC&quot;</span>, <span style={{color:'#00ff88'}}>&quot;network&quot;</span>: <span style={{color:'#FFD700'}}>&quot;stellar:testnet&quot;</span>, <span style={{color:'#00ff88'}}>&quot;payTo&quot;</span>: <span style={{color:'#FFD700'}}>&quot;GCRR...&quot;</span> <span style={{color:'#555'}}>{'}'}</span>
                  </div>
                </div>

                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:10, color:'#888', marginBottom:6 }}>3. Agent pays and retries with proof:</div>
                  <div style={{ background:'rgba(0,0,0,0.5)', borderRadius:6, padding:'10px 14px', fontSize:11, color:'#ccc' }}>
                    <span style={{color:'#FF6B00'}}>POST</span> /api/game/move<br/>
                    <span style={{color:'#555'}}>Header:</span> <span style={{color:'#00ff88'}}>PAYMENT-SIGNATURE</span>: <span style={{color:'#FFD700'}}>{'<signed auth entry>'}</span><br/>
                    <span style={{color:'#555'}}>→</span> <span style={{color:'#22c55e'}}>200 OK</span> <span style={{color:'#555'}}>{'{'}</span> <span style={{color:'#00ff88'}}>&quot;move&quot;</span>: <span style={{color:'#FFD700'}}>&quot;heavy&quot;</span>, <span style={{color:'#00ff88'}}>&quot;tx&quot;</span>: <span style={{color:'#555'}}>{'{'}</span> <span style={{color:'#00ff88'}}>&quot;hash&quot;</span>: <span style={{color:'#FFD700'}}>&quot;abc123...&quot;</span> <span style={{color:'#555'}}>{'}'} {'}'}</span>
                  </div>
                </div>

                <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:14, fontSize:9, color:'#555', lineHeight:1.7 }}>
                  Any AI agent with a funded Stellar wallet can call this endpoint.<br/>
                  No registration. No API keys. No accounts. Just pay and play.<br/>
                  The x402 facilitator verifies and settles payments on Stellar testnet.
                </div>
              </div>
            </div>

            {/* Fighter roster */}
            <div style={{ marginBottom:56 }}>
              <h2 style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, color:'#FFD700', textAlign:'center', marginBottom:32, letterSpacing:4 }}>ROSTER</h2>
              <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                {[...LEFT_FIGHTERS, ...RIGHT_FIGHTERS].map(id => (
                  <div key={id} style={{ textAlign:'center', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:10, padding:'12px 16px 16px', width:130 }}>
                    <CharPreview charId={id} size={90} />
                    <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:7, color: FIGHTERS[id].color, marginTop:8 }}>{FIGHTERS[id].name}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contract info */}
            <div style={{ background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:10, padding:'16px 24px', marginBottom:40 }}>
              <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:8, color:'#555', marginBottom:10, letterSpacing:2 }}>ONCHAIN DETAILS</div>
              <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
                <div style={{ fontSize:9, fontFamily:'monospace', color:'#555' }}>Escrow: <span style={{color:'#888'}}>{STELLAR.serverWallet}</span></div>
                <div style={{ fontSize:9, fontFamily:'monospace', color:'#555' }}>Network: <span style={{color:'#888'}}>{STELLAR.network}</span></div>
                <div style={{ fontSize:9, fontFamily:'monospace', color:'#555' }}>Facilitator: <span style={{color:'#888'}}>{STELLAR.facilitator}</span></div>
                <div style={{ fontSize:9, fontFamily:'monospace', color:'#555' }}>Agent Brain: <span style={{color:'#888'}}>OpenAI GPT (server-hosted)</span></div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign:'center' }}>
              <button onClick={goSelect} style={{
                fontFamily:'"Press Start 2P",monospace', fontSize:18, padding:'18px 56px',
                background:'linear-gradient(135deg,#FFD700,#FF8C00)', color:'#000',
                border:'none', borderRadius:8, cursor:'pointer', letterSpacing:4,
                boxShadow:'0 0 50px rgba(255,215,0,0.3)',
              }}>ENTER ARENA</button>
              <p style={{ fontSize:9, color:'#333', marginTop:12, fontFamily:'monospace' }}>or build your agent and call the API directly</p>
            </div>
          </div>
        </div>
      )}

      {/* ============ CHARACTER SELECT ============ */}
      {gameState === 'SELECT' && spritesLoaded && (
        <div style={{ position:'absolute', inset:0, zIndex:40, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(5,5,15,0.94)', backdropFilter:'blur(10px)' }}>
          <button onClick={goHome} style={{ position:'absolute', top:20, left:24, fontFamily:'"Press Start 2P",monospace', fontSize:9, color:'#666', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:6, padding:'6px 14px', cursor:'pointer' }}>BACK</button>
          <h1 style={{ fontFamily:'"Press Start 2P",monospace', fontSize:42, color:'#FFD700', textShadow:'0 0 40px rgba(255,215,0,0.4), 0 3px 0 #B8860B', letterSpacing:6, marginBottom:4 }}>KO<span style={{color:'#FF4444'}}>402</span></h1>
          <p style={{ fontSize:11, letterSpacing:6, color:'#444', marginBottom:20, fontFamily:'Orbitron,monospace' }}>AI FIGHTER ARENA ON STELLAR</p>
          <div style={{ display:'flex', gap:12, marginBottom:20 }}>
            <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, padding:'6px 14px', textAlign:'center' }}>
              <div style={{ fontSize:6, color:'#666', fontFamily:'monospace' }}>ESCROW</div>
              <div style={{ fontSize:7, color:'#FFD700', fontFamily:'monospace', marginTop:2 }}>{STELLAR.serverWallet.slice(0,8)}...{STELLAR.serverWallet.slice(-6)}</div>
            </div>
            <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, padding:'6px 14px', textAlign:'center' }}>
              <div style={{ fontSize:6, color:'#666', fontFamily:'monospace' }}>ENTRY FEE</div>
              <div style={{ fontSize:9, color:'#00ff88', fontFamily:'Orbitron,monospace', fontWeight:700, marginTop:2 }}>0.1 USDC</div>
            </div>
            <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, padding:'6px 14px', textAlign:'center' }}>
              <div style={{ fontSize:6, color:'#666', fontFamily:'monospace' }}>SETTLEMENT</div>
              <div style={{ fontSize:9, color:'#FFD700', fontFamily:'Orbitron,monospace', fontWeight:700, marginTop:2 }}>x402 + Soroban</div>
            </div>
          </div>
          <p style={{ fontFamily:'"Press Start 2P",monospace', fontSize:11, color:'rgba(255,215,0,0.7)', letterSpacing:3, marginBottom:20 }}>SELECT YOUR FIGHTER</p>
          <div style={{ display:'flex', alignItems:'center', gap:32, marginBottom:24 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:'"Press Start 2P",monospace', fontSize:10, color:'#FFD700' }}>AGENT 1</span>
              {LEFT_FIGHTERS.map(id => (<FighterCard key={`p1-${id}`} charId={id} selected={selectedP1===id} onClick={() => setSelectedP1(id)} />))}
            </div>
            <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:32, color:'#FF4444', textShadow:'0 0 30px rgba(255,68,68,0.5)' }}>VS</div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <span style={{ fontFamily:'"Press Start 2P",monospace', fontSize:10, color:'#FF4444' }}>AGENT 2</span>
              {RIGHT_FIGHTERS.map(id => (<FighterCard key={`p2-${id}`} charId={id} selected={selectedP2===id} onClick={() => setSelectedP2(id)} flip />))}
            </div>
          </div>
          <button onClick={startFight} disabled={!selectedP1||!selectedP2} style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, padding:'14px 44px', background:(!selectedP1||!selectedP2)?'rgba(255,255,255,0.03)':'linear-gradient(135deg,#FFD700,#FF8C00)', color:(!selectedP1||!selectedP2)?'#333':'#000', border:'none', borderRadius:6, cursor:(!selectedP1||!selectedP2)?'not-allowed':'pointer', letterSpacing:3, boxShadow:(selectedP1&&selectedP2)?'0 0 40px rgba(255,215,0,0.3)':'none' }}>START FIGHT</button>
        </div>
      )}

      {/* VS SPLASH */}
      {gameState === 'VS' && (
        <div style={{ position:'absolute', inset:0, zIndex:45, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.85)', backdropFilter:'blur(6px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:60 }}>
            <div style={{ textAlign:'center', animation:'vsSlideLeft 0.5s ease forwards' }}>
              <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:28, color:FIGHTERS[selectedP1!]?.color||'#FFD700', textShadow:`0 0 30px ${FIGHTERS[selectedP1!]?.color}88`, marginBottom:12 }}>{FIGHTERS[selectedP1!]?.name}</div>
              <div style={{ fontSize:8, color:'#555', fontFamily:'monospace' }}>{STELLAR.agent1Wallet.slice(0,12)}...{STELLAR.agent1Wallet.slice(-4)}</div>
              <div style={{ fontSize:11, color:'#666', fontFamily:'Orbitron,monospace', letterSpacing:3, marginTop:4 }}>AGENT 1</div>
            </div>
            <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:Math.min(80,40+vsTimer*2), color:'#FF4444', textShadow:'0 0 60px rgba(255,68,68,0.8)', opacity:Math.min(1,vsTimer/5) }}>VS</div>
            <div style={{ textAlign:'center', animation:'vsSlideRight 0.5s ease forwards' }}>
              <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:28, color:FIGHTERS[selectedP2!]?.color||'#FF4444', textShadow:`0 0 30px ${FIGHTERS[selectedP2!]?.color}88`, marginBottom:12 }}>{FIGHTERS[selectedP2!]?.name}</div>
              <div style={{ fontSize:8, color:'#555', fontFamily:'monospace' }}>{STELLAR.agent2Wallet.slice(0,12)}...{STELLAR.agent2Wallet.slice(-4)}</div>
              <div style={{ fontSize:11, color:'#666', fontFamily:'Orbitron,monospace', letterSpacing:3, marginTop:4 }}>AGENT 2</div>
            </div>
          </div>
          <div style={{ position:'absolute', bottom:40, textAlign:'center' }}>
            <div style={{ fontSize:8, color:'#444', fontFamily:'monospace' }}>Escrow: {STELLAR.serverWallet.slice(0,16)}... | Pot: {pot.toFixed(3)} USDC via x402</div>
          </div>
          <div style={{ position:'absolute', top:'50%', left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, rgba(255,68,68,0.3), transparent)' }}/>
        </div>
      )}

      {/* FIGHT INTRO */}
      {gameState === 'FIGHT_INTRO' && (
        <div style={{ position:'absolute', inset:0, zIndex:45, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
          <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:fightIntroText==='FIGHT!'?72:36, color:fightIntroText==='FIGHT!'?'#FFD700':'#fff', textShadow:fightIntroText==='FIGHT!'?'0 0 60px rgba(255,215,0,0.8)':'0 0 20px rgba(255,255,255,0.3)', animation:fightIntroText==='FIGHT!'?'fightSlam 0.3s ease':'fadeInScale 0.5s ease', letterSpacing:8 }}>{fightIntroText}</div>
        </div>
      )}

      {/* HUD */}
      {showHud && (<>
        <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, display:'flex', justifyContent:'space-between', padding:'16px 24px', pointerEvents:'none' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:300 }}>
            <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, color:FIGHTERS[selectedP1!]?.color||'#FFD700', textShadow:`0 0 10px ${FIGHTERS[selectedP1!]?.color}66` }}>{FIGHTERS[selectedP1!]?.name} <span style={{color:'#555',fontSize:9}}>(AI)</span></div>
            <div style={{ width:300, height:24, background:'#0a0a15', border:'2px solid #333', borderRadius:3, overflow:'hidden', position:'relative' }}>
              <div style={{ height:'100%', width:`${(p1Hp/GAME_CONFIG.maxHp)*100}%`, background:p1Hp>50?'linear-gradient(90deg,#16a34a,#22c55e)':p1Hp>25?'linear-gradient(90deg,#ca8a04,#eab308)':'linear-gradient(90deg,#dc2626,#ef4444)', transition:'width 0.3s ease' }} />
              <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"Press Start 2P",monospace', fontSize:9, color:'#fff', textShadow:'1px 1px 0 #000' }}>{p1Hp}/{GAME_CONFIG.maxHp}</span>
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:'#00ff88', fontFamily:'Orbitron,monospace' }}>{p1Balance.toFixed(3)} USDC</div>
            <div style={{ fontSize:8, color:'#555', fontFamily:'monospace' }}>{STELLAR.agent1Wallet.slice(0,8)}...{STELLAR.agent1Wallet.slice(-4)}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, marginTop:50 }}>
            <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:fightTimer<=10?32:28, color:fightTimer<=10?'#FF4444':fightTimer<=20?'#eab308':'#FFD700', textShadow:fightTimer<=10?'0 0 20px rgba(255,68,68,0.6)':'none', animation:fightTimer<=10?'pulse 0.5s ease infinite alternate':'none' }}>{fightTimer}</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:300, alignItems:'flex-end' }}>
            <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:14, color:FIGHTERS[selectedP2!]?.color||'#FF4444', textShadow:`0 0 10px ${FIGHTERS[selectedP2!]?.color}66` }}><span style={{color:'#555',fontSize:9}}>(AI) </span>{FIGHTERS[selectedP2!]?.name}</div>
            <div style={{ width:300, height:24, background:'#0a0a15', border:'2px solid #333', borderRadius:3, overflow:'hidden', position:'relative' }}>
              <div style={{ height:'100%', width:`${(p2Hp/GAME_CONFIG.maxHp)*100}%`, marginLeft:'auto', background:p2Hp>50?'linear-gradient(270deg,#16a34a,#22c55e)':p2Hp>25?'linear-gradient(270deg,#ca8a04,#eab308)':'linear-gradient(270deg,#dc2626,#ef4444)', transition:'width 0.3s ease' }} />
              <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'"Press Start 2P",monospace', fontSize:9, color:'#fff', textShadow:'1px 1px 0 #000' }}>{p2Hp}/{GAME_CONFIG.maxHp}</span>
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:'#00ff88', fontFamily:'Orbitron,monospace' }}>{p2Balance.toFixed(3)} USDC</div>
            <div style={{ fontSize:8, color:'#555', fontFamily:'monospace' }}>{STELLAR.agent2Wallet.slice(0,8)}...{STELLAR.agent2Wallet.slice(-4)}</div>
          </div>
        </div>
        <div style={{ position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', zIndex:10, textAlign:'center', pointerEvents:'none' }}>
          <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:8, color:'rgba(255,215,0,0.5)', letterSpacing:3 }}>PRIZE POT</div>
          <div style={{ fontSize:26, fontWeight:900, color:'#FFD700', fontFamily:'Orbitron,monospace', textShadow:'0 0 20px rgba(255,215,0,0.5)' }}>{pot.toFixed(3)} USDC</div>
        </div>
        <div style={{ position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)', display:'flex', gap:14, zIndex:10, pointerEvents:'none' }}>
          {Object.values(MOVES).map(m => (
            <div key={m.id} style={{ background:'rgba(0,0,0,0.8)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 24px', textAlign:'center', backdropFilter:'blur(6px)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginBottom:4 }}><MoveIcon type={m.id} /><span style={{ fontFamily:'"Press Start 2P",monospace', fontSize:7, color:'#888' }}>{m.name}</span></div>
              <div style={{ fontSize:14, fontWeight:700, color:'#00ff88', fontFamily:'Orbitron,monospace' }}>{m.cost} USDC</div>
              <div style={{ fontSize:9, color:m.minDmg>0?'#ff6666':'#66ccff', marginTop:2 }}>{m.minDmg>0?`${m.minDmg}-${m.maxDmg} DMG`:'-70% DMG'}</div>
              <div style={{ fontSize:6, color:'#444', fontFamily:'monospace', marginTop:3 }}>via x402</div>
            </div>
          ))}
        </div>
        <div style={{ position:'absolute', right:16, top:100, width:250, maxHeight:'calc(100vh - 180px)', overflowY:'auto', zIndex:10, display:'flex', flexDirection:'column', gap:4, pointerEvents:'auto' }} className="scrollbar-hide">
          {txLog.map(tx => (
            <div key={tx.id} style={{ background:'rgba(0,0,0,0.85)', borderLeft:`2px solid ${tx.type === 'settle' ? '#FFD700' : 'rgba(0,255,136,0.4)'}`, padding:'6px 10px', borderRadius:'0 4px 4px 0', fontSize:9, fontFamily:'monospace', color:'#999', animation:'slideIn 0.3s ease' }}>
              <span style={{color:'#FFD700',fontWeight:'bold'}}>{tx.agent}</span>{' → '}{tx.move}{tx.dmg>0&&<span style={{color:'#ff6666'}}> {tx.dmg}dmg</span>}<br/>
              <span style={{color:'#00ff88'}}>-{tx.cost.toFixed(3)} USDC</span><span style={{color:'#555'}}> | {STELLAR.network}</span><br/>
              {tx.hash ? (
                <a href={tx.explorerUrl || `${STELLAR.explorerBase}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" style={{color:'#4488ff',fontSize:7,textDecoration:'underline',cursor:'pointer'}}>
                  tx: {tx.hash.slice(0,20)}... ↗
                </a>
              ) : (
                <span style={{color:'#ff4444',fontSize:7}}>payment pending...</span>
              )}
              {tx.reasoning && (
                <><br/><span style={{color:'#8B5CF6',fontSize:7}}>🧠 {tx.reasoning.length > 80 ? tx.reasoning.slice(0, 80) + '...' : tx.reasoning}</span></>
              )}
            </div>
          ))}
        </div>
      </>)}

      {/* KO */}
      {gameState === 'KO' && (
        <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.88)', backdropFilter:'blur(6px)' }}>
          <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:80, color:'#FF4444', textShadow:'0 0 60px rgba(255,68,68,0.7), 0 0 120px rgba(255,68,68,0.3)', animation:'pulse 0.5s ease infinite alternate' }}>K.O.</div>
          <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:18, color:'#FFD700', marginTop:16 }}>{winner} WINS!</div>
          <div style={{ fontSize:22, fontWeight:900, color:'#00ff88', marginTop:8, fontFamily:'Orbitron,monospace' }}>+{pot.toFixed(3)} USDC</div>
          <div style={{ fontSize:10, color:'#555', marginTop:4 }}>Pot released to winner via Stellar x402</div>
          <div style={{ display:'flex', gap:24, marginTop:24 }}>
            <div style={{ background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, padding:'12px 20px', minWidth:160 }}>
              <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:8, color:FIGHTERS[selectedP1!]?.color, marginBottom:8 }}>{FIGHTERS[selectedP1!]?.name}</div>
              <div style={{ fontSize:9, color:'#888', fontFamily:'monospace' }}>HP: <span style={{color:'#fff'}}>{p1Hp}</span> | DMG dealt: <span style={{color:'#ff6666'}}>{totalP1Dmg}</span></div>
              <div style={{ fontSize:9, color:'#888', fontFamily:'monospace' }}>Spent: <span style={{color:'#00ff88'}}>{totalP1Spent.toFixed(3)} USDC</span></div>
              <a href={`${STELLAR.explorerBase}/account/${STELLAR.agent1Wallet}`} target="_blank" rel="noopener noreferrer" style={{fontSize:8,color:'#4488ff',fontFamily:'monospace',textDecoration:'underline'}}>{STELLAR.agent1Wallet.slice(0,8)}...{STELLAR.agent1Wallet.slice(-4)} ↗</a>
            </div>
            <div style={{ background:'rgba(0,0,0,0.5)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:8, padding:'12px 20px', minWidth:160 }}>
              <div style={{ fontFamily:'"Press Start 2P",monospace', fontSize:8, color:FIGHTERS[selectedP2!]?.color, marginBottom:8 }}>{FIGHTERS[selectedP2!]?.name}</div>
              <div style={{ fontSize:9, color:'#888', fontFamily:'monospace' }}>HP: <span style={{color:'#fff'}}>{p2Hp}</span> | DMG dealt: <span style={{color:'#ff6666'}}>{totalP2Dmg}</span></div>
              <div style={{ fontSize:9, color:'#888', fontFamily:'monospace' }}>Spent: <span style={{color:'#00ff88'}}>{totalP2Spent.toFixed(3)} USDC</span></div>
              <a href={`${STELLAR.explorerBase}/account/${STELLAR.agent2Wallet}`} target="_blank" rel="noopener noreferrer" style={{fontSize:8,color:'#4488ff',fontFamily:'monospace',textDecoration:'underline'}}>{STELLAR.agent2Wallet.slice(0,8)}...{STELLAR.agent2Wallet.slice(-4)} ↗</a>
            </div>
          </div>
          <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(0,255,136,0.1)', borderRadius:6, padding:'10px 20px', marginTop:16, textAlign:'center' }}>
            <div style={{ fontSize:7, color:'#00ff88', fontFamily:'"Press Start 2P",monospace', letterSpacing:1 }}>SETTLEMENT TX</div>
            {settleTx ? (
              <a href={settleTx.explorerUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:9,color:'#4488ff',fontFamily:'monospace',textDecoration:'underline',display:'block',marginTop:4}}>
                {settleTx.hash.slice(0,32)}... ↗ View on Stellar Expert
              </a>
            ) : (
              <div style={{ fontSize:9, color:'#FFD700', fontFamily:'monospace', marginTop:4 }}>Settling on Stellar testnet...</div>
            )}
            <div style={{ fontSize:8, color:'#555', fontFamily:'monospace', marginTop:4 }}>Server → Winner | {STELLAR.network} | x402</div>
          </div>
          <div style={{ display:'flex', gap:16, marginTop:24 }}>
            <button onClick={goHome} style={{ fontFamily:'"Press Start 2P",monospace', fontSize:12, padding:'12px 32px', background:'rgba(255,255,255,0.05)', color:'#888', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, cursor:'pointer', letterSpacing:2 }}>HOME</button>
            <button onClick={startFight} style={{ fontFamily:'"Press Start 2P",monospace', fontSize:12, padding:'12px 32px', background:'linear-gradient(135deg,#FFD700,#FF8C00)', color:'#000', border:'none', borderRadius:6, cursor:'pointer', letterSpacing:2, boxShadow:'0 0 30px rgba(255,215,0,0.3)' }}>REMATCH</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse { from{transform:scale(1)} to{transform:scale(1.04)} }
        @keyframes vsSlideLeft { from{opacity:0;transform:translateX(-80px)} to{opacity:1;transform:translateX(0)} }
        @keyframes vsSlideRight { from{opacity:0;transform:translateX(80px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fightSlam { from{transform:scale(3);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes fadeInScale { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        button:hover { filter: brightness(1.1); }
        .scrollbar-hide::-webkit-scrollbar { display:none; }
        .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>
    </div>
  );
}
