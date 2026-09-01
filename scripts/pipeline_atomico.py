import os
import json
import math
import asyncio
import aiohttp
import edge_tts
import subprocess
import re
from typing import List, Dict, Any

CONFIG_PATH = r"C:\tiktok\api_config.json"
OUTPUT_DIR = r"C:\tiktok\remotion\public"
AUDIO_DIR = os.path.join(OUTPUT_DIR, "audio")
PROJECT_DIR = r"C:\tiktok\projects\actual"
FPS = 30
VOICE = "es-ES-AlvaroNeural"

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(os.path.join(PROJECT_DIR, "audio"), exist_ok=True)

def cargar_api_key() -> str:
    key = os.environ.get("GROQ_API_KEY", "")
    if key.startswith("gsk_"):
        return key
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                k = cfg.get("GROQ_API_KEY", "") or cfg.get("groq_api_key", "")
                if k.startswith("gsk_"):
                    return k
        except Exception:
            pass
    return key

def get_audio_duration(file_path: str) -> float:
    cmd = [r"C:\tiktok\ffmpeg.exe", "-i", file_path]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", res.stderr)
    if match:
        h, m, s = match.groups()
        return round(float(h) * 3600 + float(m) * 60 + float(s), 3)
    return 5.0

def fallback_timecodes(texto: str, duracion_sec: float) -> List[Dict[str, Any]]:
    palabras = texto.split()
    if not palabras:
        return []

    # Sustracción de silencios físicos reales de Edge-TTS (medidos con FFmpeg)
    silencio_inicial = 0.25
    silencio_final = 0.95

    if duracion_sec <= (silencio_inicial + silencio_final):
        silencio_inicial = 0.05
        silencio_final = 0.10

    tiempo_distribuible = max(0.1, duracion_sec - silencio_inicial - silencio_final)
    total_caracteres = sum(len(p) for p in palabras)

    timecodes = []
    tiempo_actual = silencio_inicial

    for p in palabras:
        peso_palabra = len(p) / max(total_caracteres, 1)
        duracion_palabra = tiempo_distribuible * peso_palabra
        t_inicio = tiempo_actual
        t_fin = tiempo_actual + duracion_palabra

        timecodes.append({
            "word": p.strip().upper(),
            "start": round(t_inicio, 3),
            "end": round(t_fin, 3),
            "startFrame": int(round(t_inicio * FPS)),
            "endFrame": int(round(t_fin * FPS))
        })
        tiempo_actual += duracion_palabra

    return timecodes

async def obtener_whisper_timecodes(session: aiohttp.ClientSession, audio_path: str, texto: str, duracion: float):
    api_key = cargar_api_key()
    if not api_key:
        return fallback_timecodes(texto, duracion)

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        with open(audio_path, 'rb') as f:
            file_bytes = f.read()
        data = aiohttp.FormData()
        data.add_field('file', file_bytes, filename=os.path.basename(audio_path), content_type='audio/mpeg')
        data.add_field('model', 'whisper-large-v3')
        data.add_field('response_format', 'verbose_json')
        data.add_field('timestamp_granularities[]', 'word')
        data.add_field('prompt', texto)

        async with session.post(url, headers=headers, data=data, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            if resp.status == 200:
                res = await resp.json()
                words_raw = res.get('words', [])
                if not words_raw:
                    return fallback_timecodes(texto, duracion)
                result = []
                for w in words_raw:
                    st = float(w['start'])
                    et = float(w['end'])
                    result.append({
                        "word": w.get('word', '').strip().upper(),
                        "start": round(st, 3),
                        "end": round(et, 3),
                        "startFrame": int(round(st * FPS)),
                        "endFrame": int(round(et * FPS))
                    })
                return result
            else:
                return fallback_timecodes(texto, duracion)
    except Exception:
        return fallback_timecodes(texto, duracion)

async def procesar_escena(session: aiohttp.ClientSession, scene: dict):
    scene_id = scene["id"]
    texto = scene.get("text") or scene.get("narration") or ""
    audio_filename = f"audio_{scene_id}.mp3"
    audio_path = os.path.join(AUDIO_DIR, audio_filename)

    # Síntesis Edge-TTS
    communicate = edge_tts.Communicate(texto, VOICE)
    await communicate.save(audio_path)

    # Réplica en project
    replica_path = os.path.join(PROJECT_DIR, "audio", audio_filename)
    with open(audio_path, 'rb') as f_in, open(replica_path, 'wb') as f_out:
        f_out.write(f_in.read())

    dur_sec = get_audio_duration(audio_path)
    dur_frames = max(1, int(round(dur_sec * FPS)))
    words_data = await obtener_whisper_timecodes(session, audio_path, texto, dur_sec)

    scene["durationInSeconds"] = dur_sec
    scene["durationInFrames"] = dur_frames
    scene["words"] = words_data
    return scene

async def main():
    script_path = os.path.join(PROJECT_DIR, "script.json")
    with open(script_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    scenes = data if isinstance(data, list) else data.get("scenes", [])

    connector = aiohttp.TCPConnector(limit=10)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [procesar_escena(session, sc) for sc in scenes]
        escenas_ok = await asyncio.gather(*tasks)

    escenas_ok.sort(key=lambda x: x["id"])

    with open(script_path, "w", encoding="utf-8") as f:
        json.dump(escenas_ok, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUTPUT_DIR, "script.json"), "w", encoding="utf-8") as f:
        json.dump(escenas_ok, f, ensure_ascii=False, indent=2)

    print(f"[OK] Pipeline Atómico Acústico: {len(escenas_ok)} escenas procesadas con supresión de silencio.")

if __name__ == "__main__":
    asyncio.run(main())
