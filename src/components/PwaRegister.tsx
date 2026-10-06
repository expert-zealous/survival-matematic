"use client";
import { useEffect } from "react";
import { withBase } from "@/lib/base";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    // withBase: di GitHub Pages situs berada di /nama-repo/, bukan di root domain.
    navigator.serviceWorker
      .register(withBase("/sw.js"), { scope: withBase("/") })
      .catch((e) => console.warn("SW gagal:", e));
  }, []);
  return null;
}
