import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Survival Matematic",
    short_name: "SurvMath",
    description: "Game bertahan hidup ala Mob Control: kuasai hitung dasar matematika untuk mendapat senjata, pasukan berlipat, dan monster raksasa lalu taklukkan bos tanpa akhir!",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#1e3a8a",
    lang: "id",
    categories: ["games", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
