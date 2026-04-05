import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export interface GameContext {
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
}

const SYSTEM_PROMPT = `You are an AI fighting game agent in KO402, a pay-per-move arena on the Stellar blockchain.

Every move you make costs real USDC:
- "light" — costs 0.01 USDC, deals 10-15 damage
- "heavy" — costs 0.05 USDC, deals 25-35 damage  
- "block" — costs 0.005 USDC, reduces incoming damage by 70%

You have 100 HP. Your wallet starts with 1.0 USDC. When you run out of either HP or USDC, you lose. Winner takes the prize pot.

Strategy considerations:
- Heavy attacks deal massive damage but drain your wallet fast
- Light attacks are efficient — good damage per USDC spent
- Block when you predict the opponent will use heavy attack
- If opponent is low HP, go aggressive to finish them
- If your wallet is low, conserve with light attacks and blocks
- If opponent keeps using the same move, counter it
- Time pressure: if timer is running low and you're ahead on HP, play defensive

You must respond with ONLY one word: "light", "heavy", or "block". Nothing else.`;

export async function getAgentMove(context: GameContext): Promise<'light' | 'heavy' | 'block'> {
  try {
    const userMessage = `Game state:
- My HP: ${context.myHp}/100
- Opponent HP: ${context.opponentHp}/100
- My USDC balance: ${context.myBalance.toFixed(3)}
- Opponent USDC balance: ${context.opponentBalance.toFixed(3)}
- Round: ${context.roundNum}
- Time left: ${context.timeLeft}s
- My character: ${context.myChar}
- Opponent character: ${context.opponentChar}
- Opponent's last move: ${context.lastOpponentMove || 'none (first round)'}
- My last move: ${context.myLastMove || 'none (first round)'}

What move do you choose?`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 10,
      temperature: 0.7,
    });

    const choice = response.choices[0]?.message?.content?.trim().toLowerCase() || '';

    if (choice.includes('heavy')) return 'heavy';
    if (choice.includes('block')) return 'block';
    if (choice.includes('light')) return 'light';

    // Fallback: if GPT returns something weird, use simple heuristic
    return 'light';
  } catch (err: any) {
    console.error('GPT agent error:', err.message);
    // Fallback to simple logic if GPT fails
    return fallbackMove(context);
  }
}

function fallbackMove(ctx: GameContext): 'light' | 'heavy' | 'block' {
  const r = Math.random();
  if (ctx.myBalance < 0.01) return 'block';
  if (ctx.lastOpponentMove === 'heavy' && r < 0.4) return 'block';
  if (ctx.opponentHp < 25 && ctx.myBalance >= 0.05 && r < 0.6) return 'heavy';
  if (ctx.myBalance < 0.05) return r < 0.7 ? 'light' : 'block';
  if (r < 0.45) return 'light';
  if (r < 0.75) return 'heavy';
  return 'block';
}
