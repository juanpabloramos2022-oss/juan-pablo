---
name: factoria-v33
description: Director y orquestador autónomo de videos virales TikTok en Remotion para PC Intel i5 / 8GB RAM
---
# SKILL FACTORIA-V33
Al solicitar compilar o ajustar el video:
1. Ejecuta python scripts/pipeline_atomico.py para recalcular audios y subtítulos con supresión de silencios.
2. Valida con FFmpeg que los 12 audios tengan volumen medio en [-25dB, -20dB].
3. Compila con: npx remotion render src/index.ts TikTokComp C:\tiktok\projects\actual\output\salida.tmp.mp4 --concurrency=2 --gl=swangle --pixel-format=yuv420p --crf=21 --codec=h264 --bundle-cache=true --chromium-options="--disable-dev-shm-usage --no-sandbox --js-flags=--max-old-space-size=2048"
4. Renombra atómicamente a video_final_remotion.mp4.
