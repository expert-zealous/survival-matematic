# Perbaikan animasi GLB dan gelombang gerbang

## Apa yang diperbaiki

- Jalan dan serang dipilih berdasarkan nama Action/NLA yang sebenarnya, dengan dukungan nama Indonesia.
- Satu siklus tempur memiliki ID: persiapan → Attack satu putaran → Walk. Berstatus mengamuk tidak
  lagi membuat Roar diulang terus dan menutupi Attack.
- Track yang memiliki jeda NLA di awal/akhir dipangkas pada salinan, bukan mengubah file sumber.
- Setiap monster memiliki skeleton dan mixer sendiri. Cache model tidak ikut dibuang ketika
  sebuah monster mati/diganti.
- Semua pasukan nyata keluar melalui gerbang merah di ujung aspal. Barisan menyebar sepanjang
  lebar jalan, tetap memiliki margin pagar. Kepadatan naik dengan membagi anggaran HP, bukan
  mengalikan total kekuatan setiap gelombang.
- Pasukan yang masih mengantre di gerbang dihitung sebagai lawan tersisa. Stage tidak otomatis
  selesai setelah 60 detik apabila musuh masih ada. Tidak ada kerumunan dekoratif yang dianggap musuh.
- GLB dan animation-map dimuat network-first agar penggantian file bernama sama tidak tertahan cache lama.

## Cara memeriksa file goblin Anda

1. Menu utama → **Pemeriksa GLB · uji jalan & serang**.
2. Pilih `boss_00_goblin.glb` dari komputer. Tidak ada upload file ke server.
3. Perhatikan daftar klip: apakah benar ada Walk dan Attack/Serang?
4. Coba tombol **Serang**, lalu **Jalan → Serang**.
5. Jika nama masih NlaTrack/ArmatureAction, tentukan sendiri klip Jalan dan Serang lewat dropdown.
6. **Unduh animation-map.json**, salin ke `public/assets/models/animation-map.json`, build/deploy ulang.

Apabila hanya satu Walk yang terdaftar, ekspor ulang dari Blender. Push Down menyimpan Action ke
NLA; ia tidak menjamin bahwa dua Action ikut file ekspor. Beri nama track berbeda Walk dan Attack,
aktifkan Animations, dan gunakan mode Actions atau NLA Tracks sesuai struktur animasi. Jangan
merge semua animasi menjadi satu. Lihat panduan rinci `public/assets/models/README.md`.

Arah depan GLB tidak universal. Jika salah, ubah pilihan **Depan file** di pemeriksa dan simpan.

## Pemeriksaan teknis

```sh
npm install
node scripts/check-models.mjs
npx tsx scripts/test-game-regressions.ts
```

Audit file membaca nama, durasi dan kanal setiap GLB yang memang tersedia pada komputer Anda.
Tes regresi memakai GLB/klip sintetis, bukan mengaku memeriksa aset pengguna yang belum tersedia.

Tes browser opsional:

```sh
npx playwright install chromium
node scripts/static-build.mjs
node scripts/test-browser-models.mjs
```

Pada Linux minimal, jalankan `npx playwright install-deps chromium` bila pustaka sistem browser
belum ada. Ini hanya untuk menjalankan tes, tidak diperlukan oleh pemain.

## Update Netlify

Ambil seluruh kode terbaru, jalankan `npm install`, masukkan model/pemetaan Anda, kemudian pakai
alur deploy Anda yang sudah berjalan (`update-netlify.bat`, Git push, atau build statis dan unggah
folder out). Sesudah Published, muat ulang game agar template GLB dalam memori dibaca ulang.
