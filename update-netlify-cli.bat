@echo off
setlocal
cd /d "%~dp0"
title Deploy Survival Matematic ke Netlify (CLI)

REM ------------------------------------------------------------------
REM  Alternatif TANPA GitHub: build lalu unggah folder "out" langsung ke Netlify.
REM  Pertama kali: browser terbuka untuk login, lalu pilih
REM  "Link this directory to an existing site" dan pilih situs Anda.
REM ------------------------------------------------------------------

where node >nul 2>nul
if errorlevel 1 (
  echo [GAGAL] Node.js belum terpasang. Unduh versi LTS di https://nodejs.org
  pause
  exit /b 1
)

echo.
echo [1/2] Build statis...
call node scripts\static-build.mjs
if errorlevel 1 (
  echo.
  echo [GAGAL] Build error. Belum ada yang diunggah, situs online tetap aman.
  pause
  exit /b 1
)

echo.
echo [2/2] Mengunggah ke Netlify (production)...
call npx --yes netlify-cli deploy --dir=out --prod
if errorlevel 1 (
  echo.
  echo [GAGAL] Upload gagal. Cek koneksi internet / login Netlify Anda.
  pause
  exit /b 1
)

echo.
echo ================================================================
echo  SELESAI. Game sudah diperbarui di alamat Netlify Anda.
echo  Muat ulang dengan Ctrl+Shift+R untuk melihat versi terbaru.
echo ================================================================
pause
