# Deploy Survival Matematic ke GitHub Pages / Netlify

Game ini dibuild menjadi **situs statis** (folder `out/`). Peringkat global memakai
**Firestore langsung dari browser**, jadi tidak butuh server maupun PostgreSQL.

| | `npm run build` | `node scripts/static-build.mjs` |
|---|---|---|
| Untuk | Jalan lokal (`npm run start`) | GitHub Pages, Netlify, hosting statis |
| Hasil | folder `.next` | folder **`out`** |
| PostgreSQL | opsional | tidak dipakai |

Keduanya terpisah; `npm run build` Anda tidak berubah.

---

## 0. Uji dulu di komputer sendiri

```bat
cd /d "D:\GAME EDUKASI\SURVIVAL MATEMATIC\math-survival-game-development"
npm install
node scripts/static-build.mjs
npx serve out
```

Buka alamat yang ditampilkan `serve` (biasanya `http://localhost:3000`).
Jika berhasil, siap di-upload. Folder `out` boleh dihapus kapan saja.

> Setelah build statis, jalankan lagi `npm run build` sebelum memakai `npm run start`
> (build statis sengaja membersihkan folder `.next`).

---

## 1. GitHub Pages (otomatis lewat GitHub Actions)

File `.github/workflows/deploy-pages.yml` sudah disiapkan.

### a. Buat repository
1. Buka https://github.com/new
2. Nama repo, misalnya `survival-matematic`. Pilih **Public**
   (GitHub Pages versi gratis hanya untuk repo publik).
3. Jangan centang README/.gitignore (proyek sudah punya).

### b. Upload proyek (Command Prompt, di folder proyek)

```bat
git init
git add .
git commit -m "Survival Matematic"
git branch -M main
git remote add origin https://github.com/USERNAME/survival-matematic.git
git push -u origin main
```

Ganti `USERNAME` dengan nama akun GitHub Anda. Jika `git commit` meminta identitas:

```bat
git config --global user.name "Nama Anda"
git config --global user.email "email@anda.com"
```

### c. Aktifkan Pages
1. Repo → **Settings** → **Pages**
2. **Build and deployment → Source: GitHub Actions**
3. Buka tab **Actions**; tunggu workflow **Deploy ke GitHub Pages** berwarna hijau (± 2–3 menit).
   Jika sudah terlanjur gagal sebelum Pages diaktifkan, klik **Re-run all jobs**.

### d. Alamat game
```text
https://USERNAME.github.io/survival-matematic/
```

Awalan `/survival-matematic` dibaca otomatis dari nama repo. Jika repo bernama
`USERNAME.github.io`, game ada di `https://USERNAME.github.io/` tanpa awalan.
Untuk memaksa awalan sendiri, buat repository variable lalu tambahkan
`NEXT_PUBLIC_BASE_PATH` pada langkah *Build statis* di workflow.

### e. Update game
Cukup:
```bat
git add .
git commit -m "update"
git push
```

---

## 2. Netlify

File `netlify.toml` sudah berisi perintah build dan folder publish.

### Cara A — lewat GitHub (disarankan, update otomatis)
1. Selesaikan langkah **1a–1b** (push ke GitHub). Langkah 1c boleh dilewati.
2. https://app.netlify.com → **Add new site → Import an existing project → GitHub**
3. Pilih repo `survival-matematic`.
4. Pengaturan terisi otomatis dari `netlify.toml`:
   - Build command: `node scripts/static-build.mjs`
   - Publish directory: `out`
5. Klik **Deploy**. Alamatnya `https://nama-acak.netlify.app` (bisa diganti di
   *Site configuration → Change site name*).

### Cara B — tanpa GitHub (drag & drop)
```bat
node scripts/static-build.mjs
```
Lalu buka https://app.netlify.com/drop dan **seret folder `out`** ke halaman itu.
Untuk update, seret lagi folder `out` yang baru lewat *Deploys → drag and drop*.

### Cara C — Netlify CLI
```bat
npm install -g netlify-cli
netlify login
node scripts/static-build.mjs
netlify deploy --dir=out --prod
```

---

## 3. Firebase (penting agar peringkat jalan)

1. **Firestore Database** harus sudah dibuat di proyek `survival-matematic`.
2. **Rules** harus mengizinkan koleksi `leaderboard`:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /leaderboard/{playerId} {
         allow read: if true;
         allow write: if request.resource.data.score is int
                      && request.resource.data.name is string;
       }
     }
   }
   ```
3. Bila Anda pernah memberi **pembatasan HTTP referrer** pada API key di Google Cloud
   Console (*APIs & Services → Credentials*), tambahkan domain baru:
   `https://USERNAME.github.io/*` dan/atau `https://nama-situs.netlify.app/*`.
   Tanpa itu, peringkat gagal dimuat di domain baru.

> API key web Firebase memang tampil publik di browser; yang melindungi data adalah
> **Rules** Firestore. Aturan di atas masih longgar — untuk game yang dipublikasikan
> luas, sebaiknya tambahkan Firebase Authentication dan validasi skor.

---

## 4. Install di HP (PWA)

Buka alamat game di **Chrome Android** → menu ⋮ → **Install app / Tambahkan ke Layar utama**
(atau tombol **Install ke HP** di menu game). iPhone: Safari → **Bagikan → Tambah ke Layar Utama**.
PWA memerlukan **HTTPS**; GitHub Pages dan Netlify sudah HTTPS.

---

## 5. Aset gambar & suara

Taruh file di `public/assets/` (lihat `public/assets/README.md`), lalu `git push`
atau build ulang. Nama file harus persis; huruf besar/kecil **dibedakan** di server
Linux (`Logo.png` ≠ `logo.png`). File yang tidak ada otomatis diganti aset bawaan.

---

## 6. Masalah umum

| Gejala | Penyebab & solusi |
|---|---|
| Halaman putih / file `_next` 404 di GitHub Pages | Pastikan **Source: GitHub Actions** (bukan "Deploy from a branch"), dan build memakai `scripts/static-build.mjs` (membuat `.nojekyll`). |
| Gambar/logo tidak muncul di GitHub Pages | Alamat harus `…github.io/NAMA-REPO/` **dengan** garis miring akhir. |
| Workflow gagal "Pages not enabled" | Aktifkan Pages (langkah 1c) lalu **Re-run all jobs**. |
| Netlify: **"Site not found"** (halaman putih bertuliskan *Netlify Internal ID*) | Bukan masalah kode game. Lihat bagian **7** di bawah. |
| Netlify: "Page not found" setelah deploy | Publish directory harus `out`, bukan `.next`. Pastikan `netlify.toml` ikut ter-push. |
| Peringkat tidak termuat | Cek Rules Firestore dan pembatasan API key (bagian 3); lihat Console browser (F12). |
| Game lama masih tampil setelah update | Service worker menyimpan cache. Muat ulang keras (`Ctrl+Shift+R`) atau tutup/buka lagi aplikasinya. |
| `git push` ditolak (file > 100 MB) | Kompres/kecilkan aset; batas GitHub 100 MB per file. |
| `.env` ikut ter-upload? | Tidak — `.gitignore` sudah mengecualikannya. |

---

## 7. Netlify menampilkan "Site not found"

Halaman putih dengan tulisan *"Looks like you followed a broken link or entered a URL
that doesn't exist on Netlify"* dan **Netlify Internal ID** dibuat oleh Netlify, bukan
oleh game. Artinya **tidak ada situs yang aktif di alamat itu**. File game belum pernah
sampai ke browser, jadi tidak ada yang bisa diperbaiki di kode game.

Penyebabnya hanya tiga. Periksa **berurutan**:

### a. Alamat yang diketik tidak sama dengan nama situs
1. Buka https://app.netlify.com → klik situs Anda → **Project overview**.
2. Lihat alamat biru di bagian atas (di samping tulisan *Production*). **Klik alamat itu
   dari dashboard**, jangan mengetik sendiri. Nama situs sering berbeda sedikit
   (ada angka/kata acak, atau ejaan `matematic` / `matematik`).
3. Nama bisa diganti di **Site configuration → General → Site details → Change project name**.

### b. Belum ada deploy yang berhasil (paling sering)
1. Buka tab **Deploys**.
2. Cari baris paling atas:
   - **Published** (hijau) → kembali ke langkah **a**.
   - **Failed** (merah) → klik baris itu, buka **Deploy log**, lalu baca 20 baris terakhir.
     Penyebab yang umum:

| Isi log | Penyebab | Solusi |
|---|---|---|
| `Could not read package.json` / `Cannot find module .../scripts/static-build.mjs` | Isi proyek berada **di dalam sub-folder** repo | Di GitHub, `package.json` harus terlihat di **halaman utama repo**. Jika terlihat di dalam folder, isi **Base directory** di *Site configuration → Build & deploy → Build settings* dengan nama folder itu, atau push ulang dari dalam folder proyek. |
| `netlify.toml` tidak terbaca / publish `.next` | `netlify.toml` tidak ikut ter-upload | Pastikan `netlify.toml` terlihat di GitHub. Atau isi manual: **Build command** `node scripts/static-build.mjs`, **Publish directory** `out`. |
| `Module not found: Can't resolve '@/components/...'` | Nama file berbeda **huruf besar/kecil** (Linux membedakan, Windows tidak) | Samakan nama file dengan yang di-import. |
| `lightningcss`/`oxide`/`sharp` ... `linux-x64` tidak ditemukan | `package-lock.json` dari Windows kehilangan paket Linux | Hapus `node_modules` dan `package-lock.json`, jalankan `npm install`, lalu commit & push `package-lock.json` baru. |
| `Build script returned non-zero exit code: 2` | Error lain saat build | Salin baris merah pertama di log. |

### c. Situs pernah dihapus / dibuat ulang
Situs yang sudah dihapus tidak bisa dipulihkan. Buat situs baru dari repo yang sama
(**Add new site → Import an existing project**).

### Jalan tercepat yang pasti berhasil: drag & drop
Tidak bergantung pada build di Netlify sama sekali:

```bat
cd /d "D:\GAME EDUKASI\SURVIVAL MATEMATIC\math-survival-game-development"
node scripts/static-build.mjs
```

Lalu buka https://app.netlify.com/drop dan **seret folder `out`** ke halaman itu.
Situs baru langsung hidup dengan alamat acak `https://xxxx.netlify.app`.

Cek di komputer sendiri sebelum upload:

```bat
npx serve out
```

Jika game terbuka di `http://localhost:3000`, folder `out` pasti benar.

---

## 8. Cara update game yang sudah online di Netlify

Setiap kali kode atau aset game berubah (misalnya HP monster, PNG baru, MP3 baru), game
online tidak berubah sendiri. Anda harus mengirim versi barunya. Caranya tergantung
**bagaimana situs Netlify Anda dulu dibuat**.

### Cek dulu: situs Anda tersambung ke GitHub atau tidak?
Netlify → klik situs → tab **Deploys** → lihat baris deploy paling atas:

| Yang tertulis | Artinya | Pakai cara |
|---|---|---|
| Nama commit Anda, ada logo GitHub / "Deploy from GitHub" | Tersambung ke GitHub | **A** (otomatis) |
| "Manual deploy" / "Deploy via drag and drop" | Dibuat dengan seret folder | **B** atau **D** |

### Cara A — otomatis lewat GitHub (disarankan)
Cukup kirim perubahan ke GitHub. Netlify membangun dan menerbitkan ulang sendiri (±1–3 menit).

**Sekali klik:** dobel-klik **`update-netlify.bat`** di folder proyek.
Ia mengecek build, menyimpan perubahan, lalu `git push`. Bisa juga dengan pesan sendiri:

```bat
update-netlify.bat "HP monster lebih tebal"
```

**Atau manual** di Command Prompt (folder proyek):

```bat
git add -A
git commit -m "update game"
git push
```

Lalu pantau di tab **Deploys** sampai berstatus **Published**.

> Jika build gagal, Netlify **tidak mengganti** situs lama. Game online tetap aman dan
> tetap versi sebelumnya sampai ada deploy yang berhasil.

### Cara B — ubah situs "seret folder" menjadi otomatis
Situs yang dibuat dengan drag & drop tidak otomatis ikut `git push`. Untuk
menyambungkannya: **Site configuration → Build & deploy → Continuous deployment →
Link repository**, pilih repo GitHub Anda. Pengaturan terisi dari `netlify.toml`
(command `node scripts/static-build.mjs`, publish `out`).
Setelah itu pakai **cara A**. Jika tombol link tidak ada, buat situs baru lewat
**Add new site → Import an existing project**.

### Cara C — tanpa GitHub, lewat Netlify CLI
Dobel-klik **`update-netlify-cli.bat`**. Ia membangun lalu mengunggah folder `out` langsung ke
Netlify. Pertama kali browser terbuka untuk login, lalu pilih
*Link this directory to an existing site* dan pilih situs Anda.

### Cara D — seret ulang folder
```bat
node scripts/static-build.mjs
```
Di Netlify: situs → **Deploys** → seret folder `out` ke kotak *"Drag and drop your site output folder here"*.

### Setelah deploy: pastikan pemain mendapat versi baru
- Build statis memberi service worker **nama cache baru di setiap build**, jadi cache lama pemain dibuang otomatis.
- Di komputer: muat ulang keras dengan **Ctrl + Shift + R**.
- Di HP / aplikasi PWA: tutup aplikasi sepenuhnya, lalu buka lagi (kadang perlu dua kali).

### Gejala umum
| Gejala | Solusi |
|---|---|
| `git push` berhasil tetapi Netlify tidak berubah | Situs bukan tersambung GitHub (lihat tabel di atas) atau yang di-push bukan branch produksi. Cek *Site configuration → Build & deploy → Branches* (biasanya `main`). |
| Deploy berstatus **Building** lama / **Failed** | Buka deploy tersebut → **Deploy log**, baca 20 baris terakhir (lihat bagian 7). |
| Deploy **Published** tetapi game tampak lama | Cache browser/PWA: **Ctrl+Shift+R**, atau tutup lalu buka ulang aplikasinya. |
| Deploy selesai tetapi tidak tampil, tertulis *Auto publishing stopped* / *Locked* | Di tab Deploys klik **Start auto publishing** pada deploy terbaru. |
| `git push` meminta login | Login lewat jendela GitHub yang terbuka, atau pakai GitHub Desktop. |
| `git push` ditolak ("rejected") | Jalankan `git pull --rebase`, lalu push lagi. |

---

## 9. Sistem skor baru (v2) — peringkat dimulai ulang

Skor lama dihitung dari **jumlah damage**, sehingga di level 20-an sudah jutaan. Skor baru
dihitung dari **pencapaian** (jawaban benar + kombo, musuh dikalahkan, monster penjaga, bos,
kecepatan), jadi permainan normal berkisar **ribuan sampai ratusan ribu**:

| Rank | Skor minimum | ≈ level |
|---|---|---|
| 🥉 Perunggu | 0 | 1 |
| 🥈 Perak | 3.500 | 4 |
| 🥇 Emas | 13.000 | 8 |
| 💠 Platinum | 30.000 | 12 |
| 💎 Berlian | 65.000 | 18 |
| 🔮 Master | 120.000 | 24 |
| 👑 Grandmaster | 200.000 | 32 |
| 🌟 Legenda | 300.000 | 37 |

Akibatnya setelah update ini:

- **Rekor & rank lokal** di HP/browser pemain direset sekali (level tertinggi tetap disimpan).
- **Peringkat Firestore** memakai field baru **`pts`**. Dokumen lama (tanpa `pts`) otomatis
  tidak tampil di Top 10 dan ditimpa saat pemainnya bermain lagi. **Tidak perlu** membuat index
  baru dan **tidak perlu** mengubah Rules.
- Dokumen lama masih ada di database; bila ingin bersih, hapus koleksi `leaderboard` lewat
  Firebase Console (opsional).
- Mirror PostgreSQL (mode server) menyimpan skor lama; kosongkan tabel `players` bila dipakai:
  `TRUNCATE players, game_sessions;`
