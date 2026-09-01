---
name: factoria-v33
description: Orquestador y director cinematográfico autónomo para videos virales de TikTok en Remotion
---
# HABILIDAD FACTORIA-V33
Cuando el usuario pida crear, ajustar o auditar un video:
1. Revisa C:\tiktok\projects\actual\script.json y valida el esquema de 12 escenas atómicas.
2. Ejecuta scripts/pipeline_atomico.py para generar audios y timecodes aislados.
3. Verifica con FFmpeg que los audios no tengan clipping ni volumen < -70dB.
4. Renderiza usando: npx remotion render src/index.ts TikTokComp C:\tiktok\projects\actual\output\salida.tmp.mp4 --concurrency=2 --gl=swangle --pixel-format=yuv420p --crf=21 --codec=h264 --bundle-cache=true --chromium-options="--disable-dev-shm-usage --no-sandbox --js-flags=--max-old-space-size=2048"
5. Renombra atómicamente a video_final_remotion.mp4 y valida la duración.
