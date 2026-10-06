import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import PwaRegister from "@/components/PwaRegister";
import { BASE_PATH } from "@/lib/base";
import "./globals.css";

export const metadata: Metadata = {
  title: "Survival Matematic",
  description: "Kuasai hitung dasar matematika untuk mendapat senjata baru, pasukan berlipat ganda, dan monster raksasa. Taklukkan bos dari level mudah sampai sulit — tanpa akhir!",
  applicationName: "Survival Matematic",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Survival Matematic",
  },
  // Next.js memberi awalan base path pada link manifest, tetapi tidak pada ikon → tambahkan manual.
  icons: {
    icon: [
      { url: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" }],
  },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full overflow-hidden bg-slate-950 text-slate-100 antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
