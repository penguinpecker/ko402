import { FIGHTERS } from './gameConfig';

const imageCache: Record<string, HTMLImageElement> = {};

export function loadAllSprites(): Promise<void> {
  return new Promise((resolve) => {
    const entries: { key: string; src: string }[] = [];

    for (const charId in FIGHTERS) {
      const fighter = FIGHTERS[charId];
      for (const animId in fighter.sprites) {
        const key = `${charId}_${animId}`;
        entries.push({ key, src: fighter.sprites[animId].src });
      }
    }

    if (entries.length === 0) { resolve(); return; }

    let loaded = 0;
    entries.forEach(({ key, src }) => {
      const img = new Image();
      img.onload = () => {
        imageCache[key] = img;
        loaded++;
        if (loaded >= entries.length) resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${src}`);
        loaded++;
        if (loaded >= entries.length) resolve();
      };
      img.src = src;
    });
  });
}

export function getSpriteImage(charId: string, animId: string): HTMLImageElement | null {
  return imageCache[`${charId}_${animId}`] || null;
}
