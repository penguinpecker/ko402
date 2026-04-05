import { PlayerState, FIGHTERS, GAME_CONFIG } from './gameConfig';
import { getSpriteImage } from './spriteLoader';

// Offscreen canvas for flipping sprites
let flipCanvas: HTMLCanvasElement | null = null;
let flipCtx: CanvasRenderingContext2D | null = null;

function getFlipCanvas(w: number, h: number) {
  if (!flipCanvas) {
    flipCanvas = document.createElement('canvas');
    flipCtx = flipCanvas.getContext('2d');
  }
  flipCanvas.width = w;
  flipCanvas.height = h;
  return { canvas: flipCanvas, ctx: flipCtx! };
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#05050f');
  grad.addColorStop(0.4, '#0a0a22');
  grad.addColorStop(0.7, '#0f0f2a');
  grad.addColorStop(1, '#141430');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const gy = h * GAME_CONFIG.groundYPercent;

  // Ambient glow
  const glowGrad = ctx.createRadialGradient(w * 0.5, gy - 80, 50, w * 0.5, gy - 80, 400);
  glowGrad.addColorStop(0, 'rgba(255,215,0,0.03)');
  glowGrad.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, w, h);

  // Ground plane
  const groundGrad = ctx.createLinearGradient(0, gy, 0, h);
  groundGrad.addColorStop(0, '#12122a');
  groundGrad.addColorStop(1, '#0a0a1a');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, gy, w, h - gy);

  // Ground edge glow
  ctx.strokeStyle = 'rgba(255,215,0,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = gy; y < h; y += 25) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

  // Particles
  const t = Date.now() * 0.0008;
  for (let i = 0; i < 40; i++) {
    const px = ((Math.sin(t * 0.7 + i * 2.1) + 1) * 0.5) * w;
    const py = ((Math.cos(t * 0.5 + i * 1.3) + 1) * 0.5) * gy;
    const alpha = 0.08 + Math.sin(t + i) * 0.04;
    ctx.fillStyle = `rgba(255,215,0,${alpha})`;
    ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // Vignette
  const vigL = ctx.createLinearGradient(0, 0, w * 0.12, 0);
  vigL.addColorStop(0, 'rgba(0,0,0,0.5)'); vigL.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vigL; ctx.fillRect(0, 0, w * 0.12, h);
  const vigR = ctx.createLinearGradient(w, 0, w * 0.88, 0);
  vigR.addColorStop(0, 'rgba(0,0,0,0.5)'); vigR.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = vigR; ctx.fillRect(w * 0.88, 0, w * 0.12, h);
}

export function drawFighter(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  canvasW: number,
  canvasH: number,
  deltaFrames: number,
) {
  if (!player.char) return;
  const config = FIGHTERS[player.char];
  if (!config) return;
  const spriteData = config.sprites[player.anim] || config.sprites.idle;
  if (!spriteData) return;
  const img = getSpriteImage(player.char, player.anim) || getSpriteImage(player.char, 'idle');
  if (!img) return;

  const { scale, offsetY } = config;
  const { frameW, frameH, frames } = spriteData;
  const dw = frameW * scale;
  const dh = frameH * scale;
  const groundY = canvasH * GAME_CONFIG.groundYPercent;

  // Dynamic x position based on current canvas width
  const xPos = player.facing === 1
    ? canvasW * GAME_CONFIG.p1StartXPercent
    : canvasW * GAME_CONFIG.p2StartXPercent;

  // Animate
  player.frameTimer += deltaFrames;
  const speed = player.anim === 'idle' ? GAME_CONFIG.animSpeedIdle : GAME_CONFIG.animSpeedAction;
  if (player.frameTimer >= speed) {
    player.frameTimer = 0;
    player.frame++;
    if (player.frame >= frames) {
      if (player.anim === 'death') { player.frame = frames - 1; player.isDead = true; }
      else if (player.anim !== 'idle') { player.anim = 'idle'; player.frame = 0; }
      else { player.frame = 0; }
    }
  }

  const sx = Math.min(player.frame, frames - 1) * frameW;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(xPos, groundY, dw * 0.22, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hit flash
  if (player.anim === 'takehit') {
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.02) * 0.4;
  }

  // Draw sprite - use offscreen canvas for P2 flip (guaranteed to work)
  const drawX = xPos - dw / 2;
  const drawY = groundY - dh + offsetY;

  // Determine if we need to flip the sprite
  // Flip when: sprite faces right but player should face left, or sprite faces left but player should face right
  const shouldFaceLeft = player.facing === -1;
  const needsFlip = config.spriteFacesRight === shouldFaceLeft;

  if (needsFlip) {
    // Flip using offscreen canvas
    const { canvas: fc, ctx: fctx } = getFlipCanvas(frameW, frameH);
    fctx.clearRect(0, 0, frameW, frameH);
    fctx.save();
    fctx.translate(frameW, 0);
    fctx.scale(-1, 1);
    fctx.drawImage(img, sx, 0, frameW, frameH, 0, 0, frameW, frameH);
    fctx.restore();
    ctx.drawImage(fc, 0, 0, frameW, frameH, drawX, drawY, dw, dh);
  } else {
    ctx.drawImage(img, sx, 0, frameW, frameH, drawX, drawY, dw, dh);
  }

  ctx.globalAlpha = 1;

  // Block shield
  if (player.blocking) {
    const shieldAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
    ctx.strokeStyle = `rgba(0,255,136,${shieldAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(xPos, groundY - dh * 0.5, dw * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(0,255,136,${shieldAlpha * 0.15})`;
    ctx.fill();
  }
}

export function drawHitEffect(ctx: CanvasRenderingContext2D, x: number, y: number, timer: number) {
  if (timer <= 0) return;
  const alpha = timer / 15;
  const size = (15 - timer) * 4;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Date.now() * 0.01;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * size * 0.3, y + Math.sin(angle) * size * 0.3);
    ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    ctx.stroke();
  }
  const flashGrad = ctx.createRadialGradient(x, y, 0, x, y, size * 0.5);
  flashGrad.addColorStop(0, 'rgba(255,255,255,0.8)');
  flashGrad.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.fillStyle = flashGrad;
  ctx.fillRect(x - size, y - size, size * 2, size * 2);
  ctx.restore();
}
