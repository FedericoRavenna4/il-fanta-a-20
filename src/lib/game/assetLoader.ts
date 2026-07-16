import {
  GAME_ASSET_ENTRIES,
  GAME_ASSETS,
  type GameAssetKey,
} from "./assets";

export type GameImageMap = ReadonlyMap<GameAssetKey, HTMLImageElement>;
export type AssetProgressCallback = (progress: number) => void;

const entryMap = new Map(GAME_ASSET_ENTRIES);
const images = new Map<GameAssetKey, HTMLImageElement>();
const requests = new Map<GameAssetKey, Promise<void>>();
const teamLogos = new Map<string, HTMLImageElement>();
const teamLogoRequests = new Map<string, Promise<HTMLImageElement>>();
const overlayImages: HTMLImageElement[] = [];

const ESSENTIAL_KEYS: GameAssetKey[] = [
  "background.stage1Stadium",
  "background.stage1Ground",
  "hazard.stage1",
  "obstacle.cornerFlag",
  "obstacle.stretcher",
  "obstacle.slidingTackle",
  "obstacle.var",
  "bonus.assist",
  "bonus.cleanSheet",
  "bonus.goal",
  "bonus.hatTrick",
  "malus.yellowCard",
  "malus.concededGoal",
  "malus.redCard",
  "malus.ownGoal",
  "malus.missedPenalty",
  "powerup.luperto",
  "powerup.lukaku",
  "powerup.dybala",
  "powerup.nicoPaz",
  "powerup.gimenez",
];

const SECONDARY_KEYS = GAME_ASSET_ENTRIES
  .map(([key]) => key)
  .filter((key) => !ESSENTIAL_KEYS.includes(key));

let essentialPromise: Promise<GameImageMap> | null = null;
let fullPromise: Promise<GameImageMap> | null = null;
let secondaryPromise: Promise<GameImageMap> | null = null;
let overlayAssetPromise: Promise<void> | null = null;

export function preloadEssentialGameAssets(
  onProgress?: AssetProgressCallback
): Promise<GameImageMap> {
  if (essentialPromise) {
    onProgress?.(1);
    return essentialPromise;
  }
  essentialPromise = Promise.all([
    loadKeys(ESSENTIAL_KEYS, (progress) => onProgress?.(progress * 0.94)),
    preloadOverlayAssets(),
  ]).then(() => {
    onProgress?.(1);
    return images;
  });
  return essentialPromise;
}

export function preloadGameAssets(
  onProgress?: AssetProgressCallback
): Promise<GameImageMap> {
  if (fullPromise) {
    onProgress?.(1);
    return fullPromise;
  }
  fullPromise = (async () => {
    await Promise.all([
      loadKeys(ESSENTIAL_KEYS, (progress) => onProgress?.(progress * 0.56)),
      preloadOverlayAssets(),
    ]);
    onProgress?.(0.58);
    await loadKeys(SECONDARY_KEYS, (progress) => onProgress?.(0.58 + progress * 0.42));
    void preloadOverlayAssets();
    return images;
  })();
  return fullPromise;
}

export function preloadSecondaryGameAssets(): Promise<GameImageMap> {
  if (secondaryPromise) return secondaryPromise;
  secondaryPromise = (async () => {
    for (let index = 0; index < SECONDARY_KEYS.length; index += 3) {
      await Promise.all(SECONDARY_KEYS.slice(index, index + 3).map((key) => loadAsset(key)));
    }
    await preloadOverlayAssets();
    return images;
  })();
  return secondaryPromise;
}

export function preloadTeamLogo(path: string): Promise<HTMLImageElement> {
  const cached = teamLogos.get(path);
  if (cached) return Promise.resolve(cached);
  const pending = teamLogoRequests.get(path);
  if (pending) return pending;

  const request = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try { await image.decode?.(); } catch { /* onload garantisce comunque l'asset. */ }
      teamLogos.set(path, image);
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Impossibile caricare ${path}`));
    image.src = path;
  }).finally(() => teamLogoRequests.delete(path));
  teamLogoRequests.set(path, request);
  return request;
}

async function loadKeys(
  keys: GameAssetKey[],
  onProgress?: AssetProgressCallback
) {
  let completed = 0;
  onProgress?.(0);
  await Promise.all(keys.map(async (key) => {
    await loadAsset(key);
    completed += 1;
    onProgress?.(completed / keys.length);
  }));
}

function preloadOverlayAssets() {
  if (overlayAssetPromise) return overlayAssetPromise;
  const paths = [
    GAME_ASSETS.powerups.lupertoBanner,
    GAME_ASSETS.powerups.lukakuBanner,
    GAME_ASSETS.powerups.dybalaBanner,
    GAME_ASSETS.powerups.nicoPazBanner,
    GAME_ASSETS.powerups.gimenezBanner,
    GAME_ASSETS.events.bossBanner,
    GAME_ASSETS.events.bossWarning,
    GAME_ASSETS.events.bonusBurst,
    GAME_ASSETS.events.malusBurst,
  ];
  overlayAssetPromise = Promise.all(paths.map(loadOverlayImage)).then(() => undefined);
  return overlayAssetPromise;
}

function loadOverlayImage(path: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = path;
    overlayImages.push(image);
  });
}

function loadAsset(key: GameAssetKey) {
  if (images.has(key)) return Promise.resolve();
  const pending = requests.get(key);
  if (pending) return pending;
  const path = entryMap.get(key);
  if (!path) return Promise.resolve();

  const request = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = async () => {
      try { await image.decode?.(); } catch { /* onload è sufficiente come fallback. */ }
      images.set(key, image);
      resolve();
    };
    image.onerror = () => {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[FantaRunner] Asset non disponibile: ${key}`);
      }
      resolve();
    };
    image.src = path;
  }).finally(() => requests.delete(key));
  requests.set(key, request);
  return request;
}
