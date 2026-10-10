# Model GLB: cara memeriksa animasi Blender

## File yang dipakai

Bos: `boss_00_goblin.glb`, `boss_01_pirate.glb`, `boss_02_golem.glb`,
`boss_03_spider.glb`, `boss_04_dragon.glb`, `boss_05_lava.glb`, `boss_06_titan.glb`,
`boss_07_wizard.glb`, `boss_08_hydra.glb`, `boss_09_doom.glb`.

Bantuan: `giant_00_ape.glb`, `giant_01_robot.glb`, `giant_02_dragon.glb`,
`giant_03_ogre.glb`, `giant_04_dino.glb`, `giant_05_octopus.glb`.

Tidak perlu mengubah file gambar ikon. Monster di arena memakai GLB; jika GLB tidak ada,
model prosedural bawaan yang digunakan. Bentuk gerak semua GLB diputar oleh pengontrol yang sama.

## 1. Periksa GLB hasil ekspor, bukan hanya file .blend

Dari menu game buka **Pemeriksa GLB · uji jalan & serang**. Tautan lokal:
`http://localhost:3000/model-check`. Di hosting statis: `/model-check.html`.

- Klik **Pilih GLB komputer** dan pilih file hasil ekspor Blender Anda.
  File diperiksa di browser, tidak diunggah ke server.
- Daftar **Klip yang terbaca** menunjukkan nama persis, panjang dalam detik, dan jumlah kanal.
- Tekan **Jalan**, **Serang**, lalu **Jalan → Serang** untuk melihat pergantiannya berulang.
- Bila namanya `NlaTrack`, `ArmatureAction`, atau tidak sesuai fungsi, pilih klip yang tepat
  pada dropdown **Pemetaan animasi**. Dua klip generik hanya ditebak berdasarkan urutan;
  periksa secara visual, jangan mengandalkan tebakan itu.
- Jika Blender mengekspor **jalan lalu serang sebagai satu klip panjang**, centang
  **Ambil rentang waktu dari satu klip gabungan** pada baris Jalan dan Serang. Pilih klip
  yang sama, lalu isi detik mulai/selesai masing-masing bagian (contoh Jalan 0–2.4,
  Serang 2.4–4.1). Coba siklusnya sampai benar.
- Unduh **animation-map.json**; salin ke folder ini, menimpa file yang lama, kemudian build/deploy.
  Pemeriksa menggabungkan pengaturan file ini dengan file pengaturan yang sudah dimuat.
  Jika Anda mengedit beberapa model secara terpisah, pastikan entri sebelumnya tetap disimpan.

Pemeriksaan command line, tanpa WebGL:

```sh
node scripts/check-models.mjs
node scripts/check-models.mjs public/assets/models/boss_00_goblin.glb
```

Perintah tersebut memeriksa semua file yang benar-benar ada di komputer tempat perintah dijalankan.
Ia tidak bisa memeriksa GLB di komputer lain yang belum disalin ke proyek.

## 2. Ekspor dari Blender dengan benar

1. Buat Action jalan dan serangan yang berbeda. Nama yang paling aman: **Walk** dan **Attack**.
2. Push Down / Stash setiap Action ke **NLA Track tersendiri**. Nama track juga harus berbeda:
   **Walk** dan **Attack**. Nama NLA bisa menjadi nama klip saat ekspor.
3. Ekspor **glTF Binary (.glb)** dengan **Animations** aktif.
   - **Actions**: cocok untuk pustaka aksi karakter, satu Action per track.
   - **NLA Tracks**: gunakan bila mengandalkan beberapa strip/modifier dalam satu track;
     setiap track diekspor sebagai klip tersendiri.
4. Jangan gabungkan jalan dan serang ke satu klip melalui opsi merge semua animasi.
   Jangan hanya mengekspor Action aktif jika Action serang ada di track lain.
5. Cek opsi pembatas frame/range agar tidak memotong serangan. Bake constraints/drivers ke
   keyframe jika animasi bergantung pada kontrol yang tidak didukung glTF.
6. Impor file GLB hasil ekspor ke pemeriksa game. **Push Down saja tidak membuktikan bahwa
   Attack masuk ke file akhir**.

Jika daftar hanya berisi satu `Walk`, kode game tidak bisa membuat ulang gerakan serang yang
belum diekspor. Ekspor ulang atau gunakan pemetaan jika klipnya ada dengan nama lain.

Dokumentasi Blender: https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html#animations

## 3. File animation-map.json (opsional)

File bawaan `{}` berarti pencocokan nama otomatis. Contoh jika track Anda belum dinamai:

```json
{
  "boss_00_goblin.glb": {
    "clips": {
      "walk": "NlaTrack",
      "attack": "NlaTrack.001"
    },
    "forward": "+Z",
    "trimPadding": true
  }
}
```

Pilih nama dari daftar klip file Anda sendiri; jangan menyalin nama contoh bila berbeda.
Untuk klip tidak ada, biarkan otomatis atau pilih **Tidak tersedia**.

Nama otomatis mengenali `Walk`, `Run`, `Jalan`, `Berjalan`, `Attack`, `Serang`, `Menyerang`,
`Punch`, `Pukul`, `Hantam`, `Slam`, termasuk awalan Armature dan akhiran `.001`.
Klip reaksi seperti `HitReaction`/`Hurt` tidak dianggap sebagai serangan.

`trimPadding` memotong jeda diam bersama di awal/akhir track NLA sehingga animasi langsung
bergerak. Matikan jika jeda diam tersebut memang bagian dari desain animasi.

## 4. Ukuran, arah, dan animasi

- Posisi kaki dan tinggi disesuaikan otomatis tanpa mengubah transform asli mesh.
- **Arah depan file tidak selalu sama** antar pembuat. Bawaan menganggap +Z; jika salah,
  pilih +Z/-Z/+X/-X di pemeriksa, lalu simpan pengaturannya.
- Rig internal menghadap -Z. Bantuan menghadap musuh; bos diputar menghadap pemain.
- Setiap instance memiliki skeleton/mixer sendiri. Menghapus satu monster tidak menghapus
  geometri/tekstur yang masih dipakai monster lain.
- Perintah serang datang dari engine: satu ID untuk persiapan → hantaman → pemulihan.
  Animasi Attack menyelesaikan satu putaran, kemudian kembali Walk. Kondisi mengamuk
  tidak lagi memaksa Roar diputar terus sampai menghalangi Attack.
- Model dengan Walk tetapi tanpa Attack menggunakan gerakan tubuh cadangan saat menyerang,
  bukan berpura-pura memainkan klip Walk sebagai Attack. Gerakan ini bukan rigging otomatis.
- Model statis tanpa tulang/klip tetap tidak memiliki animasi anggota badan asli. Buat rig
  dan animasi di Blender untuk mendapatkan gerakan kaki/tangan yang benar.

Saran HP: GLB dengan tekstur tertanam, ukuran <=5 MB, tekstur <=1024–2048 px, geometri
seefisien mungkin. Draco/Meshopt didukung; Draco memerlukan decoder online pada pemakaian pertama.

## 5. Sesudah mengganti model

Build ulang dan deploy versi baru. Service worker menggunakan **network-first** untuk GLB
beserta animation-map agar tidak menampilkan file lama. Saat offline, cache terakhir bisa dipakai.
Jika sesi game masih terbuka, tutup/buka atau reload agar template model di memori ikut dimuat ulang.
