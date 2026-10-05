"use client";
import { useEffect, useState } from "react";
import { assetExists, bossAssetUrl, giantAssetUrl } from "@/lib/game/assets";

/** Ikon bos: PNG kustom kalau ada, kalau tidak emoji bawaan. */
export function BossIcon({ index, emoji, size = 40 }: { index: number; emoji: string; size?: number }) {
  const [png, setPng] = useState(false);
  const url = bossAssetUrl(index);
  useEffect(() => {
    assetExists(url).then(setPng);
  }, [url]);
  if (png) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={{ width: size, height: size }} className="object-contain" onError={() => setPng(false)} />;
  }
  return <span style={{ fontSize: size * 0.85 }}>{emoji}</span>;
}

/** Ikon monster raksasa milik pemain. */
export function GiantIcon({ giantIndex, emoji, size = 40 }: { giantIndex: number; emoji: string; size?: number }) {
  const [png, setPng] = useState(false);
  const url = giantAssetUrl(giantIndex);
  useEffect(() => {
    assetExists(url).then(setPng);
  }, [url]);
  if (png) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={{ width: size, height: size }} className="object-contain" onError={() => setPng(false)} />;
  }
  return <span style={{ fontSize: size * 0.85 }}>{emoji}</span>;
}
