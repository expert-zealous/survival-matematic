"use client";
import { useEffect, useState } from "react";
import { LOGO_URL, MENU_BG_URL, assetExists } from "@/lib/game/assets";

/** Logo game: pakai public/assets/logo.png kalau ada, kalau tidak pakai teks. */
export function GameLogo({ compact = false }: { compact?: boolean }) {
  const [hasLogo, setHasLogo] = useState(false);
  useEffect(() => {
    assetExists(LOGO_URL).then(setHasLogo);
  }, []);
  if (hasLogo) {
    return (
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="Survival Matematic"
          className={compact ? "h-16 w-auto object-contain drop-shadow-[0_4px_0_rgba(0,0,0,.5)]" : "h-28 w-auto object-contain drop-shadow-[0_6px_0_rgba(0,0,0,.45)]"}
          onError={() => setHasLogo(false)}
        />
      </div>
    );
  }
  return (
    <h1
      className={`logo-text font-black leading-none text-white drop-shadow-[0_6px_0_#1e3a8a] ${compact ? "text-3xl" : "mt-2 text-5xl"}`}
    >
      SURVIVAL
      <br />
      <span className="text-amber-300 drop-shadow-[0_6px_0_#9a3412]">MATEMATIC</span>
    </h1>
  );
}

/** Latar menu: pakai public/assets/menu_bg.png kalau ada, kalau tidak pakai bawaan. */
export function MenuBackground() {
  const [custom, setCustom] = useState(false);
  useEffect(() => {
    assetExists(MENU_BG_URL).then(setCustom);
  }, []);
  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url('${custom ? MENU_BG_URL : "/images/menu-bg.jpg"}')` }}
    />
  );
}
