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

## 🧊 MONSTER 3D — file model `.glb` (opsional, hasil paling bagus)

Monster di game sudah **3D ber-sendi sungguhan** (pinggul, lutut, bahu, siku, leher,
ekor, sayap) sehingga melangkah, mengayun tangan, dan menghantam dengan mulus.
Bawaannya sudah 3D — **tidak wajib** menyediakan file apa pun.

Kalau ingin memakai model buatan sendiri (Blender/Mixamo/Sketchfab), taruh file
**`.glb`** di folder `public/assets/models/`. File ini **menggantikan** model bawaan:

| File | Monster |
|---|---|
| `models/boss_00_goblin.glb` | #1 Goblin Pencuri |
| `models/boss_01_pirate.glb` | #2 Kapten Bajak Laut |
| `models/boss_02_golem.glb` | #3 Golem Batu |
| `models/boss_03_spider.glb` | #4 Ratu Laba-laba |
| `models/boss_04_dragon.glb` | #5 Naga Es |
| `models/boss_05_lava.glb` | #6 Raja Lava |
| `models/boss_06_titan.glb` | #7 Titan Emas |
| `models/boss_07_wizard.glb` | #8 Penyihir Bayangan |
| `models/boss_08_hydra.glb` | #9 Hydra Kristal |
| `models/boss_09_doom.glb` | #10 Dewa Kehancuran |
| `models/giant_00_ape.glb` | Kera raksasa |
| `models/giant_01_robot.glb` | Robot |
| `models/giant_02_dragon.glb` | Naga |
| `models/giant_03_ogre.glb` | Oni |
| `models/giant_04_dino.glb` | Dino |
| `models/giant_05_octopus.glb` | Gurita |

Ketentuan model agar hasil rapi:
- Format **`.glb`** (bukan `.fbx`/`.obj`), satu monster per file. Ukuran dan posisi kaki
  dinormalisasi otomatis. Arah depan **tidak universal**; bawaan dianggap +Z dan dapat
  diperbaiki +Z/-Z/+X/-X melalui halaman Pemeriksa GLB.
- Animasi harus benar-benar masuk ke GLB. Nama `Walk`/`Run`/`Jalan` dan
  `Attack`/`Serang`/`Pukul` dikenali otomatis. Jangan anggap klip pertama sebagai serang.
- Bila jalan+serang menjadi satu timeline, gunakan rentang waktu di Pemeriksa GLB.
- Batas ukuran file disarankan **< 15 MB** agar HP tidak berat. Panduan lengkap:
  `public/assets/models/README.md`.

> PNG monster (`boss_XX_*.png`, `giant_XX_*.png`) **tidak lagi dipakai** oleh game —
> silakan hapus dari folder ini. Foto 2D memang tidak bisa menjadi monster 3D yang mulus.

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

1. Taruh file, misal `public/assets/logo.png` atau model `public/assets/models/boss_06_titan.glb`.
2. Rebuild / refresh halaman.
3. Logo muncul di menu, Titan Emas tampil sebagai gambarmu di level 7
   dan tetap bisa meraung + menghantam.
