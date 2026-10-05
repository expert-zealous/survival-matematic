"use client";
import { useRef, useState } from "react";
import { fileToAvatar, formatScore, saveProfile, type Profile, type SaveData } from "@/lib/storage";
import { getRank } from "@/lib/game/data";
import { submitScoreToFirestore } from "@/lib/firebase";
import { Avatar, GameButton, Panel, RankBadge, TopBar } from "./ui";

interface Props {
  profile: Profile;
  save: SaveData;
  onBack: () => void;
  onSaved: (p: Profile) => void;
}

export default function ProfileScreen({ profile, save, onBack, onSaved }: Props) {
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState<string | null>(profile.photo);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rank = getRank(save.bestScore);

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setBusy(true);
      const data = await fileToAvatar(f, 128);
      setPhoto(data);
      setMsg(null);
    } catch {
      setMsg("Gagal membaca foto. Coba foto lain.");
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const clean = name.trim().slice(0, 16);
    if (!clean) {
      setMsg("Nama tidak boleh kosong.");
      return;
    }
    const next: Profile = { ...profile, name: clean, photo };
    saveProfile(next);
    onSaved(next);
    setMsg("✅ Profil tersimpan!");
    // keep the global leaderboard entry in sync (never lowers the stored best score)
    if (save.bestScore > 0) {
      try {
        await submitScoreToFirestore({ id: next.id, name: clean, photo, score: save.bestScore, level: save.bestLevel, rank: rank.name });
      } catch {
        /* offline – will sync after the next game */
      }
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-indigo-950 via-slate-950 to-slate-950">
      <TopBar title="Profil Pemain" onBack={onBack} />
      <div className="px-4 pb-10">
        <Panel className="mt-2 flex flex-col items-center">
          <div className="relative">
            <Avatar photo={photo} name={name} size={120} ring={rank.color} />
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-press absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-lg shadow-lg"
              aria-label="Ganti foto"
            >
              📷
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          <div className="mt-3 flex gap-2">
            <button onClick={() => fileRef.current?.click()} className="btn-press rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
              {busy ? "Memproses…" : "📁 Pilih dari Galeri"}
            </button>
            {photo && (
              <button onClick={() => setPhoto(null)} className="btn-press rounded-full bg-rose-600/30 px-3 py-1.5 text-xs font-bold text-rose-200">
                Hapus Foto
              </button>
            )}
          </div>
          <div className="mt-3">
            <RankBadge score={save.bestScore} />
          </div>

          <label className="mt-5 w-full text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Nama Pemain</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              maxLength={16}
              placeholder="Masukkan nama…"
              className="mt-1 w-full rounded-2xl border border-white/15 bg-slate-800 px-4 py-3 text-lg font-black text-white outline-none ring-sky-400 placeholder:font-semibold placeholder:text-slate-500 focus:ring-2"
            />
            <div className="mt-1 text-right text-[10px] text-slate-500">{name.length}/16</div>
          </label>

          {msg && <div className="mt-2 w-full rounded-xl bg-white/10 px-3 py-2 text-center text-sm font-bold text-white">{msg}</div>}

          <GameButton variant="gold" className="mt-4 w-full" onClick={() => void submit()} disabled={busy}>
            💾 Simpan Profil
          </GameButton>
        </Panel>

        <Panel className="mt-4">
          <div className="text-xs font-black uppercase tracking-wider text-sky-300">Statistik</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <Row k="Skor Tertinggi" v={formatScore(save.bestScore)} />
            <Row k="Level Tertinggi" v={`${save.bestLevel}`} />
            <Row k="Total Main" v={`${save.games}`} />
            <Row k="Bos Ditaklukkan" v={`${Object.keys(save.bosses).length}/10`} />
            <Row k="Jawaban Benar" v={`${save.correct}`} />
            <Row k="Jawaban Salah" v={`${save.wrong}`} />
          </div>
          <div className="mt-3 text-[11px] text-slate-400">ID pemain: {profile.id.slice(0, 8)}… · Hanya skor tertinggimu yang disimpan di peringkat global.</div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <div className="text-[10px] text-slate-400">{k}</div>
      <div className="font-black text-white tabular-nums">{v}</div>
    </div>
  );
}
