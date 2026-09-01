@echo off
chcp 65001 > nul
cls
echo ============================================================
echo   FACTORIA V33.8 - INYECTOR DE COMBUSTIBLE REAL
echo ============================================================
echo.

echo [1/3] Generando guion simbiotico de shock biologico (12 escenas)...
python C:\tiktok\scripts\generador_guion.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo critico en la generacion del guion.
    pause
    exit /b %ERRORLEVEL%
)
echo.

echo [2/3] Generando narracion de audio y calibracion fonetica proporcional...
python C:\tiktok\scripts\generador_audio.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Fallo critico en la generacion de audio.
    pause
    exit /b %ERRORLEVEL%
)
echo.

echo ============================================================
echo   [3/3] FASE DE PRE-PRODUCCION COMPLETADA CON EXITO
echo   ABRIR EXTENSION HANS ACHA PARA GENERAR IMAGENES EN VIBES
echo ============================================================
echo.
echo Los archivos base ya estan listos en C:\tiktok\projects\actual\:
echo   - script.json (12 escenas optimizadas)
echo   - audio_narracion.mp3 (Voz hiperrealista calibrada)
echo   - timecodes.json (Subtitulos sincronizados sin Whisper)
echo.
echo Una vez generadas las imagenes (escena_1.png a escena_12.png):
echo Ejecuta Sync-Remotion para renderizar el video 9:16:
echo   powershell -NoProfile -ExecutionPolicy Bypass -File C:\tiktok\remotion\Sync-Remotion.ps1
echo.
pause
