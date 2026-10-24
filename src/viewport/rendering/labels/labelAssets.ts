import { Assets, type Texture } from 'pixi.js';
import { loadMsdfAtlas, type MsdfAtlasData } from './msdfAtlas';

export interface LabelAssets {
  atlasData: MsdfAtlasData;
  atlasTexture: Texture;
}

function labelAssetBase(): string {
  return import.meta.env.BASE_URL ?? '/';
}

const ATLAS_TEXTURE_URL = `${labelAssetBase()}fonts/msdf/atlas.png`;

let cached: Promise<LabelAssets> | null = null;

export function loadLabelAssets(): Promise<LabelAssets> {
  if (!cached) {
    cached = load().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
}

async function load(): Promise<LabelAssets> {
  const [atlasData, atlasTexture] = await Promise.all([
    loadMsdfAtlas(),
    Assets.load<Texture>(ATLAS_TEXTURE_URL),
  ]);
  return { atlasData, atlasTexture };
}
