import {
  GAME_ASSET_ENTRIES,
  GAME_ASSETS,
  PRIORITY_GAME_ASSET_KEYS,
  type GameAssetKey,
} from "./assets";

export type GameImageMap = ReadonlyMap<GameAssetKey, HTMLImageElement>;

let assetPromise: Promise<GameImageMap> | null = null;
let overlayAssetPromise: Promise<void> | null = null;
const overlayImages: HTMLImageElement[] = [];

export function preloadGameAssets(): Promise<GameImageMap> {
  if (assetPromise) return assetPromise;

  assetPromise = (async () => {
    const images = new Map<GameAssetKey, HTMLImageElement>();
    const entryMap = new Map(GAME_ASSET_ENTRIES);

    await Promise.all(
      PRIORITY_GAME_ASSET_KEYS.map((key) => loadAsset(key, entryMap.get(key), images))
    );

    await Promise.all(
      GAME_ASSET_ENTRIES.filter(([key]) => !PRIORITY_GAME_ASSET_KEYS.includes(key)).map(
        ([key, path]) => loadAsset(key, path, images)
      )
    );

    void preloadOverlayAssets();

    return images;
  })();

  return assetPromise;
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
  overlayAssetPromise = new Promise<void>((resolve) => {
    window.setTimeout(async () => {
      await Promise.all(paths.map((path) => new Promise<void>((done) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => done();
        image.onerror = () => done();
        image.src = path;
        overlayImages.push(image);
      })));
      resolve();
    }, 0);
  });
  return overlayAssetPromise;
}

async function loadAsset(
  key: GameAssetKey,
  path: string | undefined,
  images: Map<GameAssetKey, HTMLImageElement>
) {
  if (!path || images.has(key)) return;
  const image = new Image();
  image.decoding = "async";
  image.src = path;

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Impossibile caricare ${path}`));
    });
    images.set(key, image);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[FantaRunner] Asset non disponibile: ${key}`, error);
    }
  } finally {
    image.onload = null;
    image.onerror = null;
  }
}
