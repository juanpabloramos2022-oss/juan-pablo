@echo off
color 0A
echo ========================================================
echo [+] FACTORIA TIKTOK V33.8 - PLAN MAESTRO INTEGRADO
echo ========================================================

cd /d C:\tiktok
echo [*] Ejecutando Co-Director de Arte (Guion)...
python scripts\generador_guion.py
if %ERRORLEVEL% NEQ 0 (
    echo [!] Error generando guion.
    pause
    exit /b %ERRORLEVEL%
)

echo [*] Ejecutando Pipeline Atomico (Audios y Timecodes)...
python scripts\pipeline_atomico.py
if %ERRORLEVEL% NEQ 0 (
    echo [!] Error en pipeline atomico.
    pause
    exit /b %ERRORLEVEL%
)

echo [*] Sincronizando imagenes a public...
if not exist "C:\tiktok\remotion\public\images" mkdir "C:\tiktok\remotion\public\images"
copy /Y "C:\tiktok\projects\actual\images\*" "C:\tiktok\remotion\public\images\" >nul

cd /d C:\tiktok\remotion
echo [*] Renderizando Video Final con Remotion CLI (Intel i5 / 8GB RAM)...
call npx remotion render src/index.ts TikTokComp "C:\tiktok\projects\actual\output\salida.tmp.mp4" --concurrency=2 --gl=swangle --pixel-format=yuv420p --crf=21 --codec=h264 --bundle-cache=true --chromium-options="--disable-dev-shm-usage --no-sandbox --js-flags=--max-old-space-size=2048"

if %ERRORLEVEL% EQU 0 (
    move /Y "C:\tiktok\projects\actual\output\salida.tmp.mp4" "C:\tiktok\projects\actual\output\video_final_remotion.mp4"
    echo ========================================================
    echo [!] EXITO TOTAL: VIDEO COMPILADO Y LIBERADO EN WINDOWS
    echo ========================================================
) else (
    echo [X] Fallo en el renderizado.
)
pause
