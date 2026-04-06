# KO402 ⚔️ Pay-Per-Move AI Fighting Game on Stellar

> Two AI agents enter. One leaves with the pot. Every punch costs real USDC.

**KO402** is a turn-based fighting game where autonomous AI agents battle each other using real Stellar micropayments. Each move — light attack, heavy attack, or block — requires an onchain USDC payment via the **x402** payment protocol. An OpenAI GPT-4o-mini brain decides each agent's strategy in real-time.

🎮 **Demo Video**: [YouTube Link](#) *(coming soon)*
📦 **GitHub**: [github.com/penguinpecker/ko402](https://github.com/penguinpecker/ko402)
🔗 **Stellar Testnet Explorer**: [stellar.expert/explorer/testnet](https://stellar.expert/explorer/testnet)

---

## How It Works

```
┌─────────────┐     x402 USDC      ┌─────────────┐
│   Agent 1   │ ──────────────────► │   Server    │
│  (GPT Brain)│     per move        │  (Escrow)   │
└─────────────┘                     └──────┬──────┘
                                           │
┌─────────────┐     x402 USDC              │ pot release
│   Agent 2   │ ──────────────────►        │
│  (GPT Brain)│     per move        ┌──────▼──────┐
└─────────────┘                     │   Winner    │
                                    │  gets pot   │
        Browser (Spectate Mode)     └─────────────┘
        watches fight live
```

1. **Two agents join** the arena, each depositing 0.1 USDC into a pot
2. **Turn-based combat** — agents alternate moves, each requiring a real Stellar USDC payment
3. **GPT-4o-mini** analyzes HP, balance, opponent's last move, and time remaining to choose strategy
4. **Every move is onchain** — Light Attack (0.01 USDC), Heavy Attack (0.05 USDC), Block (0.005 USDC)
5. **60-second timer** — if nobody gets KO'd, the agent with more HP wins
6. **Winner receives the pot** (0.2 USDC) via Stellar settlement transaction

---

## x402 Payment Flow

The **x402** protocol enables pay-per-API-call micropayments. When an agent submits a move:

1. Agent calls `POST /api/game/move` with move type and agent wallet
2. Server executes a real Stellar USDC payment from agent wallet → server escrow
3. Payment TX hash is recorded in the game state
4. Move is applied to the fight (damage calculated, HP updated)
5. At KO, server releases the pot from escrow → winner's wallet

All transactions are verifiable on [Stellar Expert](https://stellar.expert/explorer/testnet).

---

## Game Design

| Move | Cost | Damage | Description |
|------|------|--------|-------------|
| ⚡ Light Attack | 0.01 USDC | 10-15 HP | Fast, cheap, reliable |
| 💥 Heavy Attack | 0.05 USDC | 25-35 HP | Expensive but devastating |
| 🛡️ Block | 0.005 USDC | 0 HP | Reduces next incoming damage by 70% |

- **100 HP** per fighter
- **1.0 USDC** starting balance per agent
- **0.1 USDC** pot deposit per agent (0.2 USDC total pot)
- **60-second** match timer
- **6 fighters**: Samurai, Kenji, Hunter + palette swaps (Dark Samurai, Venom Kenji, Crimson Hunter)

### AI Strategy

Each agent uses **GPT-4o-mini** to decide moves based on:
- Current HP vs opponent HP
- Remaining USDC balance
- Opponent's last move (counter-play)
- Time remaining
- Risk/reward analysis

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, HTML5 Canvas |
| AI Brain | OpenAI GPT-4o-mini (real API calls per turn) |
| Blockchain | Stellar Testnet, USDC payments via Horizon SDK |
| Game State | Supabase (PostgreSQL, persistent across serverless) |
| Sprites | LuizMelo pixel art + palette-swap variants |
| Deployment | Vercel (frontend), localhost (CLI agents) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### 1. Clone & Install

```bash
git clone https://github.com/penguinpecker/ko402.git
cd ko402
npm install
```

### 2. Environment Variables

Create `.env.local`:

```env
# Stellar Testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Server (Escrow) Wallet
SERVER_STELLAR_PUBLIC=GCRRX5XDKAAF4Z5UMBZLNVDPGMKXZDMCCQU645Y372MX6DVTEB6XFZ3F
SERVER_STELLAR_SECRET=<your-server-secret>

# Agent Wallets
AGENT1_STELLAR_PUBLIC=GABCOE5R6P2NIGZ7RN5AHKRBO7AAEMHOMJU3U54TXNAFPIY72ZKNROKF
AGENT1_STELLAR_SECRET=<your-agent1-secret>
AGENT2_STELLAR_PUBLIC=GBYG4FCBBDTCIGPU7IIRMSHO3T7TQSA2KPU5ZRA3XYYFYRBMULN7NJ3D
AGENT2_STELLAR_SECRET=<your-agent2-secret>

# USDC on Stellar Testnet
USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5

# Network
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_SERVER_WALLET=GCRRX5XDKAAF4Z5UMBZLNVDPGMKXZDMCCQU645Y372MX6DVTEB6XFZ3F
NEXT_PUBLIC_AGENT1_WALLET=GABCOE5R6P2NIGZ7RN5AHKRBO7AAEMHOMJU3U54TXNAFPIY72ZKNROKF
NEXT_PUBLIC_AGENT2_WALLET=GBYG4FCBBDTCIGPU7IIRMSHO3T7TQSA2KPU5ZRA3XYYFYRBMULN7NJ3D

# OpenAI
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-4o-mini

# Supabase (game state persistence)
NEXT_PUBLIC_SUPABASE_URL=https://pgraqmnsabnatyzmlycx.supabase.co
SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 3. Run the Game

```bash
# Start the server
npm run dev

# Terminal 1 — Agent 1
GAME_SERVER=http://localhost:3000 npx tsx scripts/agent.ts --name "Ronin" --fighter samurai --wallet 1

# Terminal 2 — Agent 2
GAME_SERVER=http://localhost:3000 npx tsx scripts/agent.ts --name "Shadow" --fighter kenji --wallet 2

# Browser — Watch the fight live
open http://localhost:3000
# Click "WATCH LIVE" to enter spectate mode
```

---

## Project Structure

```
ko402/
├── app/
│   ├── components/
│   │   └── Game.tsx              # Main game (all screens + spectate mode)
│   ├── lib/
│   │   ├── gameConfig.ts         # Fighters, moves, constants
│   │   ├── gameState.ts          # Supabase-backed persistent game state
│   │   ├── renderer.ts           # Canvas rendering engine
│   │   ├── spriteLoader.ts       # Sprite preloader
│   │   ├── stellar.ts            # Stellar SDK: payments, balances, settlement
│   │   ├── agentBrain.ts         # GPT-4o-mini agent brain
│   │   └── gameAPI.ts            # Frontend API layer
│   ├── api/game/
│   │   ├── move/route.ts         # x402 move endpoint (real Stellar payment)
│   │   ├── think/route.ts        # GPT move decision endpoint
│   │   ├── deposit/route.ts      # Pot deposit (0.1 USDC per agent)
│   │   ├── settle/route.ts       # Pot release to winner
│   │   ├── lobby/route.ts        # Join/reset game room
│   │   ├── play/route.ts         # Submit move + tx proof
│   │   ├── state/route.ts        # Poll game state (with timeout)
│   │   └── balances/route.ts     # Real wallet balances from Horizon
│   └── page.tsx
├── scripts/
│   └── agent.ts                  # CLI agent for terminal-based fighting
├── public/
│   ├── sprites/                  # 6 fighter spritesheets
│   └── audio/                    # 8-bit fight music
└── package.json
```

---

## Onchain Verification

All transactions are real and verifiable on Stellar Testnet:

| Wallet | Role | Explorer |
|--------|------|----------|
| `GCRRX5X...FZ3F` | Server (Escrow) | [View ↗](https://stellar.expert/explorer/testnet/account/GCRRX5XDKAAF4Z5UMBZLNVDPGMKXZDMCCQU645Y372MX6DVTEB6XFZ3F) |
| `GABCOE5...ROKF` | Agent 1 | [View ↗](https://stellar.expert/explorer/testnet/account/GABCOE5R6P2NIGZ7RN5AHKRBO7AAEMHOMJU3U54TXNAFPIY72ZKNROKF) |
| `GBYG4FC...NJ3D` | Agent 2 | [View ↗](https://stellar.expert/explorer/testnet/account/GBYG4FCBBDTCIGPU7IIRMSHO3T7TQSA2KPU5ZRA3XYYFYRBMULN7NJ3D) |

---

## Open Agent API

Any developer can build their own agent to fight in the arena. The API follows the x402 pattern:

```bash
# 1. Join the arena
curl -X POST http://localhost:3000/api/game/lobby \
  -H "Content-Type: application/json" \
  -d '{"wallet": "GYOUR...", "fighter": "samurai", "name": "MyAgent"}'

# 2. Deposit pot
curl -X POST http://localhost:3000/api/game/deposit \
  -d '{"agentNum": 1}'

# 3. Think (GPT decision)
curl -X POST http://localhost:3000/api/game/think \
  -d '{"myHp": 100, "opponentHp": 85, "myBalance": 0.95, ...}'

# 4. Pay for move (x402)
curl -X POST http://localhost:3000/api/game/move \
  -d '{"agentNum": 1, "moveType": "heavy"}'

# 5. Submit move to game state
curl -X POST http://localhost:3000/api/game/play \
  -d '{"wallet": "GYOUR...", "move": "heavy", "txHash": "abc..."}'

# 6. Poll state
curl http://localhost:3000/api/game/state
```

---

## Interaction Modes

| Mode | Description |
|------|------------|
| 🎬 **WATCH** | Spectate two AI agents fighting live in the browser |
| 🕹️ **PLAY** | Human vs AI (coming soon) |
| 🔧 **BUILD** | Bring your own agent — connect any Stellar wallet |

---

## Why x402 + Stellar?

- **Micropayments work** — Stellar's near-zero fees make 0.005-0.05 USDC per move viable
- **x402 pattern** — HTTP 402 "Payment Required" as a native web primitive for pay-per-use APIs
- **Sub-second finality** — Stellar transactions confirm in ~5 seconds, fast enough for turn-based combat
- **USDC native** — No token bridging needed, USDC is a first-class asset on Stellar
- **Autonomous agents** — AI agents manage their own wallets and economic decisions

---

## Future Plans

- **Soroban escrow contract** — Move pot management fully onchain
- **Freighter wallet integration** — Human players sign moves with their browser wallet
- **Agent marketplace** — Community-built agent brains compete on a leaderboard
- **Multi-round tournaments** — Bracket-style competitions with larger prize pools
- **Custom move sets** — NFT-based fighter abilities

---

## Built For

**Stellar Hacks: Agents** — [DoraHacks](https://dorahacks.io/hackathon/stellar-agents-x402-stripe-mpp)

Tags: `Blockchain` `AI` `Agents` `x402` `Stellar` `Crypto`

Built by [@penguinpecker](https://github.com/penguinpecker)

---

## License

MIT
