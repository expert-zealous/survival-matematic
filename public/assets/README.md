# 📁 Folder Aset — Survival Matematic

Taruh file PNG / MP3 milikmu di folder ini. **Nama file harus persis** seperti di bawah
agar otomatis dipakai game. Semua file bersifat **opsional** — kalau tidak ada,
game memakai model 3D + suara bawaan (fallback), jadi game tetap jalan.

## 🖼️ Logo & latar

| File | Ukuran saran | Dipakai di |
|---|---|---|
| `logo.png` | 1024×512, transparan | Menu utama (pengganti teks SURVIVAL MATEMATIC) |
| `menu_bg.png` | 1080×1920 (portrait) | Latar menu utama |
| `cannon.png` | 512×512, transparan | (cadangan) ikon meriam |
| `gate_mul.png` | 512×256 | (cadangan) tekstur gerbang × |
| `gate_add.png` | 512×256 | (cadangan) tekstur gerbang + |

## 👹 Bos lawan (10) — tampil di arena 3D + galeri bos

PNG transparan, ukuran saran **1024×1024**, monster menghadap kamera:

| File | Bos |
|---|---|
| `boss_00_goblin.png` | #1 Goblin Pencuri |
| `boss_01_pirate.png` | #2 Kapten Bajak Laut |
| `boss_02_golem.png` | #3 Golem Batu |
| `boss_03_spider.png` | #4 Ratu Laba-laba |
| `boss_04_dragon.png` | #5 Naga Es |
| `boss_05_lava.png` | #6 Raja Lava |
| `boss_06_titan.png` | #7 Titan Emas |
| `boss_07_wizard.png` | #8 Penyihir Bayangan |
| `boss_08_hydra.png` | #9 Hydra Kristal |
| `boss_09_doom.png` | #10 Dewa Kehancuran |

> Kalau file ada, gambar PNG-mu **DIUBAH OTOMATIS menjadi monster 3D voxel**
> (kubus-kubus bervolume mengikuti bentuk & warna gambarmu) yang tampil di
> arena sebagai makhluk 3D sungguhan: **berjalan mendekati pemain, bergoyang,
> meraung → angkat tangan → menghantam → shockwave**. Bukan gambar 2D!
> Kalau tidak ada, monster 3D bawaan yang tampil (tetap bisa menghantam).

## 🦍 Monster raksasa milik pemain (6) — hadiah soal matematika

PNG transparan, ukuran saran **1024×1024**:

| File | Monster |
|---|---|
| `giant_00_ape.png` | Kera Raksasa |
| `giant_01_robot.png` | Robot |
| `giant_02_dragon.png` | Naga |
| `giant_03_ogre.png` | Ogre |
| `giant_04_dino.png` | Dino |
| `giant_05_octopus.png` | Gurita |

> Monster ini muncul saat kamu menjawab soal dengan benar, lalu berjalan dan
> **menghantam kerumunan musuh (AoE slam + shockwave)** secara otomatis.
> Gambar PNG-mu juga diubah menjadi **3D voxel** (bukan tempelan gambar datar),
> lengkap dengan animasi langkah & hantaman.

## 🧍 Unit kecil (opsional, cadangan)

| File | Untuk |
|---|---|
| `unit_player.png` | Pasukan biru |
| `unit_grunt.png` | Musuh grunt |
| `unit_runner.png` | Musuh pelari |
| `unit_brute.png` | Musuh brute |
| `unit_elite.png` | Musuh elite |

## 🔊 Suara & musik — `audio/` (MP3)

| File | Dipakai saat |
|---|---|
| `audio/sfx_shoot.mp3` | Meriam menembak |
| `audio/sfx_hit.mp3` | Pukulan kecil pasukan |
| `audio/sfx_smash.mp3` | Hantaman monster / brute / elite |
| `audio/sfx_slam.mp3` | Hantaman raksasa & bos (ground slam) |
| `audio/sfx_roar.mp3` | Raungan bos sebelum menghantam |
| `audio/sfx_warning.mp3` | Tanda bahaya ❗ |
| `audio/sfx_gate.mp3` | Lewat gerbang |
| `audio/sfx_correct.mp3` | Jawaban benar |
| `audio/sfx_wrong.mp3` | Jawaban salah |
| `audio/sfx_boss_down.mp3` | Bos kalah |
| `audio/sfx_levelup.mp3` | Senjata naik |
| `audio/sfx_gameover.mp3` | Kalah |
| `audio/sfx_giant.mp3` | Monster raksasa muncul |
| `audio/sfx_click.mp3` | Klik soal |
| `audio/music_menu.mp3` | Musik menu (loop) |
| `audio/music_battle.mp3` | Musik pertempuran (loop) |
| `audio/music_boss.mp3` | Musik bos mengamuk (loop) |

Tips MP3:
- Format: MP3 128–192 kbps, mono/stereo bebas.
- Musik sebaiknya tanpa jeda hening di awal/akhir agar loop mulus.
- Kalau file belum ada, game memakai suara synth bawaan — tetap bunyi.

## ✅ Cara cek

1. Taruh file, misal `public/assets/logo.png` dan `public/assets/boss_06_titan.png`.
2. Rebuild / refresh halaman.
3. Logo muncul di menu, Titan Emas tampil sebagai gambarmu di level 7
   dan tetap bisa meraung + menghantam.
