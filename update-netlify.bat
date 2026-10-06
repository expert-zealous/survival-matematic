@echo off
setlocal
cd /d "%~dp0"
title Update Survival Matematic ke Netlify

REM ------------------------------------------------------------------
REM  Sekali klik: cek build -> simpan perubahan -> kirim ke GitHub.
REM  Netlify yang sudah tersambung ke GitHub akan menerbitkan ulang sendiri.
REM
REM  Pakai:   dobel-klik file ini
REM           atau:  update-netlify.bat "pesan perubahan saya"
REM ------------------------------------------------------------------

where git >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Git belum terpasang. Unduh di https://git-scm.com/download/win
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Folder ini belum terhubung ke GitHub.
  echo         Ikuti langkah "1b. Upload proyek" di DEPLOY.md terlebih dahulu.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Node.js belum terpasang. Unduh versi LTS di https://nodejs.org
  pause
  exit /b 1
)

set "MSG=%~1"
if "%MSG%"=="" set "MSG=update game %DATE% %TIME:~0,5%"

echo.
echo [1/3] Mengecek build statis (sama persis dengan yang dijalankan Netlify)...
call node scripts\static-build.mjs
if errorlevel 1 (
  echo.
  echo [GAGAL] Build error. Belum ada yang dikirim ke GitHub, situs online tetap aman.
  echo         Perbaiki error di atas, lalu jalankan file ini lagi.
  pause
  exit /b 1
)

echo.
echo [2/3] Menyimpan perubahan...
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo Tidak ada perubahan baru untuk dikirim.
  pause
  exit /b 0
)
git commit -m "%MSG%"
if errorlevel 1 (
  echo.
  echo [GAGAL] git commit gagal. Jika diminta identitas, jalankan sekali:
  echo         git config --global user.name "Nama Anda"
  echo         git config --global user.email "email@anda.com"
  pause
  exit /b 1
)

echo.
echo [3/3] Mengirim ke GitHub...
git push
if errorlevel 1 (
  echo.
  echo [GAGAL] git push ditolak. Coba jalankan:  git pull --rebase
  echo         lalu dobel-klik file ini lagi.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo  SELESAI. Netlify sedang menerbitkan ulang (sekitar 1-3 menit).
echo  Pantau di: https://app.netlify.com  ^>  situs Anda  ^>  Deploys
echo  Setelah berstatus "Published", muat ulang game dengan Ctrl+Shift+R.
echo ================================================================
pause
