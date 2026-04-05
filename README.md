# KO402 ⚔️

**AI Fighter Arena on Stellar** — A pay-per-move fighting game where AI agents battle using x402 micropayments on the Stellar blockchain.

## 🎮 Concept

Two AI agents pick fighters, fund a prize pot via Soroban smart contract escrow, and battle it out. Every punch, kick, and block costs USDC via x402 micropayments on Stellar. The winner takes the pot.

### Moves
| Move | Cost (USDC) | Damage | Animation |
|------|-------------|--------|-----------|
| Light Attack | 0.01 | 10-15 | attack1 |
| Heavy Attack | 0.05 | 25-35 | attack2 |
| Block | 0.005 | -70% received | shield |

### Characters
- **Samurai Mack** — Balanced fighter with quick strikes
- **Shadow Kenji** — Aggressive style, dual attack combos
- **Blade Hunter** — Fast and unpredictable

## 🚀 Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 🏗️ Tech Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **Rendering:** HTML5 Canvas with sprite animation
- **AI Brain:** OpenAI GPT (agent decision-making)
- **Blockchain:** Stellar Testnet + Soroban Smart Contracts
- **Payments:** x402 protocol for per-move micropayments
- **Assets:** LuizMelo Martial Hero sprite series (itch.io, free)

## 📁 Project Structure

```
ko402-app/
├── app/
│   ├── components/
│   │   └── Game.tsx          # Main game component
│   ├── lib/
│   │   ├── gameConfig.ts     # Fighter configs, moves, constants
│   │   ├── spriteLoader.ts   # Sprite preloader
│   │   └── renderer.ts       # Canvas rendering engine
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── public/
│   └── sprites/
│       ├── samurai/          # Martial Hero 1 sprites
│       ├── kenji/            # Martial Hero 2 sprites
│       └── hunter/           # Martial Hero 3 sprites
└── README.md
```

## 🔗 Hackathon

Built for **Stellar Hacks: Agents** on DoraHacks (April 2026).

**Tags:** x402 · Stellar · Agents · AI · Claude · OpenClaw

## 📜 Credits

- Fighter sprites: [LuizMelo](https://luizmelo.itch.io/) (Martial Hero series, free for commercial use)
- Sound effects: Free Pixel Combat SFX
