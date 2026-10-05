"use client";
import { useEffect, useState } from "react";
import { loadProfile, loadSave, type Profile, type SaveData, DEFAULT_SAVE } from "@/lib/storage";
import MainMenu from "./MainMenu";
import GameScreen from "./GameScreen";
import ProfileScreen from "./ProfileScreen";
import LeaderboardScreen from "./LeaderboardScreen";
import BossGallery from "./BossGallery";

type Screen = "menu" | "play" | "profile" | "leaderboard" | "bosses";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [profile, setProfile] = useState<Profile>({ id: "", name: "", photo: null });
  const [save, setSave] = useState<SaveData>(DEFAULT_SAVE);
  const [startLevel, setStartLevel] = useState(1);
  const [gameKey, setGameKey] = useState(0);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [returnTo, setReturnTo] = useState<Screen>("menu");

  useEffect(() => {
    setProfile(loadProfile());
    setSave(loadSave());
    setReady(true);
    const ua = navigator.userAgent;
    setIsIos(/iPhone|iPad|iPod/i.test(ua));
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const choice = await installEvt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvt(null);
  };

  const play = () => {
    if (!profile.name) {
      setReturnTo("play");
      setScreen("profile");
      return;
    }
    setGameKey((k) => k + 1);
    setScreen("play");
  };

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 text-white">
        <div className="animate-pulse text-xl font-black">Memuat…</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      {screen === "menu" && (
        <MainMenu
          profile={profile}
          save={save}
          startLevel={startLevel}
          onStartLevel={setStartLevel}
          onPlay={play}
          onProfile={() => {
            setReturnTo("menu");
            setScreen("profile");
          }}
          onLeaderboard={() => setScreen("leaderboard")}
          onBosses={() => setScreen("bosses")}
          canInstall={!!installEvt}
          onInstall={() => void install()}
          isIos={isIos}
          installed={installed}
        />
      )}
      {screen === "play" && (
        <GameScreen
          key={gameKey}
          profile={profile}
          save={save}
          startLevel={startLevel}
          onExit={() => setScreen("menu")}
          onSaveChanged={setSave}
          onOpenLeaderboard={() => setScreen("leaderboard")}
          onRestart={() => setGameKey((k) => k + 1)}
        />
      )}
      {screen === "profile" && (
        <ProfileScreen
          profile={profile}
          save={save}
          onBack={() => setScreen("menu")}
          onSaved={(p) => {
            setProfile(p);
            if (returnTo === "play") {
              setReturnTo("menu");
              setGameKey((k) => k + 1);
              setScreen("play");
            }
          }}
        />
      )}
      {screen === "leaderboard" && <LeaderboardScreen profile={profile} save={save} onBack={() => setScreen("menu")} />}
      {screen === "bosses" && <BossGallery save={save} onBack={() => setScreen("menu")} />}
    </div>
  );
}
