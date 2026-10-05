"use client";
import type { ReactNode } from "react";
import { RANKS, getRank } from "@/lib/game/data";

export function Avatar({ photo, name, size = 48, ring }: { photo: string | null; name: string; size?: number; ring?: string }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-indigo-600 text-white font-black flex items-center justify-center shadow-lg"
      style={{ width: size, height: size, fontSize: size * 0.42, boxShadow: ring ? `0 0 0 3px ${ring}, 0 6px 16px rgba(0,0,0,.35)` : undefined }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

export function RankBadge({ score, small, name }: { score?: number; small?: boolean; name?: string }) {
  const rank = name ? (RANKS.find((r) => r.name === name) ?? RANKS[0]) : getRank(score ?? 0);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-extrabold text-slate-900 ${small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}`}
      style={{ background: rank.color, boxShadow: `0 0 12px ${rank.color}80` }}
    >
      <span>{rank.icon}</span>
      {rank.name}
    </span>
  );
}

export function GameButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "gold" | "ghost";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const styles: Record<string, string> = {
    primary: "bg-gradient-to-b from-sky-400 to-blue-600 text-white border-blue-800 shadow-[0_6px_0_#1e3a8a]",
    secondary: "bg-gradient-to-b from-slate-600 to-slate-800 text-white border-slate-900 shadow-[0_6px_0_#020617]",
    danger: "bg-gradient-to-b from-rose-400 to-red-600 text-white border-red-900 shadow-[0_6px_0_#7f1d1d]",
    gold: "bg-gradient-to-b from-amber-300 to-orange-500 text-slate-900 border-orange-700 shadow-[0_6px_0_#9a3412]",
    ghost: "bg-white/10 text-white border-white/20 shadow-none backdrop-blur",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn-press select-none rounded-2xl border-b-4 px-5 py-3 text-base font-black uppercase tracking-wide transition active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:active:translate-y-0 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl backdrop-blur-md ${className}`}>{children}</div>;
}

export function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
      <button onClick={onBack} aria-label="Kembali" className="btn-press h-10 w-10 rounded-full bg-white/10 text-white text-xl font-black backdrop-blur">
        ‹
      </button>
      <h1 className="flex-1 text-xl font-black text-white drop-shadow">{title}</h1>
      {right}
    </div>
  );
}
