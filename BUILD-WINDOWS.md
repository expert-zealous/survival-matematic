# Cara Build Survival Matematic di Windows

## Penyebab error pada screenshot

Pesan berikut:

```text
Error: DATABASE_URL is required
Error: Failed to collect page data for /api/scores
```

berarti proyek versi lama mewajibkan PostgreSQL saat proses build. Pada versi
terbaru, PostgreSQL sudah **opsional**: ranking utama tetap memakai Firestore dan
build dapat dilakukan tanpa `DATABASE_URL`.

> Pesan `vulnerabilities`, `funding`, dan `install-scripts` dari npm adalah
> peringatan, bukan penyebab build gagal. Jangan langsung menjalankan
> `npm audit fix --force`, karena dapat mengganti versi dependensi secara paksa.

---

## 1. Persiapan

Gunakan salah satu versi Node.js LTS:

- Node.js 20 LTS, atau
- Node.js 22 LTS.

Cek versi dari Command Prompt:

```bat
node -v
npm -v
```

Masuk ke folder proyek (sesuaikan lokasinya):

```bat
cd /d "D:\GAME EDUKASI\SURVIVAL MATEMATIC\math-survival-game-development"
```

`/d` diperlukan jika berpindah drive, misalnya dari `C:` ke `D:`.

---

## 2. Bersihkan hasil instalasi/build lama

### Command Prompt (CMD)

```bat
rmdir /s /q .next 2>nul
rmdir /s /q node_modules 2>nul
del package-lock.json 2>nul
npm cache verify
npm install
```

### PowerShell

```powershell
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm cache verify
npm install
```

Jika `npm install` menampilkan peringatan `install-scripts`, tetapi selesai dan
kembali ke prompt tanpa `npm ERR!`, lanjutkan saja. Bila instalasi benar-benar
bermasalah karena script belum disetujui, jalankan:

```bat
npm install-scripts list
```

Lalu setujui paket yang disebutkan oleh npm, misalnya:

```bat
npm install-scripts approve sharp
npm install-scripts approve esbuild
```

Ulangi `npm install`. Perintah ini hanya diperlukan pada versi npm yang memakai
fitur `allowScripts`.

---

## 3. Build tanpa PostgreSQL (disarankan)

Tidak perlu membuat `.env`. Ranking global memakai Firestore.

Jalankan:

```bat
npm run build
```

Jika berhasil, bagian akhirnya akan menampilkan daftar route dan kembali ke
prompt tanpa tulisan `Build error occurred`.

Jalankan hasil build:

```bat
npm run start
```

Kemudian buka:

```text
http://localhost:3000
```

Hentikan server dengan `Ctrl + C`.

> Ingin dimainkan lewat internet (GitHub Pages / Netlify)? Gunakan build statis,
> lihat **`DEPLOY.md`**.
>
> Hasil `npm run build` adalah aplikasi Next.js pada folder `.next`, bukan file
> APK. Jalankan dengan `npm run start`, deploy ke hosting Node.js, atau pasang
> sebagai PWA melalui menu browser **Install ke HP**.

---

## 4. Mode PostgreSQL (opsional)

Gunakan ini hanya jika ingin menyimpan mirror/riwayat permainan di PostgreSQL.
Firestore tetap menjadi sumber ranking global utama.

Buat file `.env.local` di folder utama proyek:

```env
DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@127.0.0.1:5432/app_db
```

Pastikan PostgreSQL aktif dan database `app_db` sudah dibuat. Kemudian:

```bat
npx drizzle-kit push
npm run build
npm run start
```

Jika tidak membutuhkan mirror PostgreSQL, hapus saja `.env.local`; build akan
otomatis memakai mode Firestore-only.

---

## 5. Firebase/Firestore

Konfigurasi publik Firebase proyek `survival-matematic` sudah ada di aplikasi.
Pastikan Firestore Database sudah dibuat pada Firebase Console dan rules koleksi
`leaderboard` mengizinkan read/write sesuai kebutuhan aplikasi.

Untuk produksi, aturan Firestore sebaiknya diperketat menggunakan Firebase
Authentication dan validasi skor di server. Konfigurasi `apiKey` web Firebase
bukan password rahasia, tetapi aturan Firestore tetap menentukan akses data.

---

## 6. Jika masih error

Jalankan tiga perintah berikut dan lihat error lengkapnya:

```bat
npx next typegen
npx tsc --noEmit --pretty false
npm run build
```

Beberapa penyebab umum:

1. **Kode belum versi terbaru** — `src/db/index.ts` lama masih berisi:
   `throw new Error("DATABASE_URL is required")`.
2. **Node terlalu lama** — upgrade ke Node 20/22 LTS.
3. **Folder `.next` dari build lama** — hapus `.next` lalu build ulang.
4. **Dependensi rusak/tidak lengkap** — hapus `node_modules` dan
   `package-lock.json`, lalu `npm install` lagi.
5. **Path folder berspasi** — selalu gunakan tanda petik pada perintah `cd /d`.
6. **Port 3000 dipakai aplikasi lain** — jalankan:

```bat
npm run start -- -p 3001
```

lalu buka `http://localhost:3001`.
