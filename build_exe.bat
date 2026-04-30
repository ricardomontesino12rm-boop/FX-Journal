@echo off
echo [1/3] Limpiando cache de build...
if exist ".next\cache" rmdir /s /q ".next\cache"

echo [2/3] Reinstalando dependencias necesarias...
call "C:\Program Files\nodejs\npm.cmd" install

echo [3/3] Ensamblando tu archivo .exe final...
call "C:\Program Files\nodejs\npm.cmd" run tauri:build

echo ¡Proceso Completado con Exito!
