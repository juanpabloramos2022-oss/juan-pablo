import asyncio
import json
import os
import subprocess
import aiohttp
import edge_tts

CONFIG_PATH = r"C:\tiktok\api_config.json"
OUTPUT_DIR = r"C:\tiktok\remotion\public"
AUDIO_DIR = os.path.join(OUTPUT_DIR, "audio")
PROJECT_DIR = r"C:\tiktok\projects\actual"
FPS = 30

def obtener_groq_key():
    key = os.environ.get("GROQ_API_KEY", "")
    if key.startswith("gsk_"):
        return key
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                k = cfg.get("GROQ_API_KEY", "") or cfg.get("groq_api_key", "")
                if k.startswith("gsk_"):
                    return k
        except Exception:
            pass
    return key

GROQ_API_KEY = obtener_groq_key()
VOICE = "es-ES-AlvaroNeural"

os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(os.path.join(PROJECT_DIR, "audio"), exist_ok=True)

async def generate_audio(id_escena, text):
    output_path = os.path.join(AUDIO_DIR, f"audio_{id_escena}.mp3")
    communicate = edge_tts.Communicate(text, VOICE)
    await communicate.save(output_path)
    # Réplica en proyecto
    replica_path = os.path.join(PROJECT_DIR, "audio", f"audio_{id_escena}.mp3")
    with open(output_path, 'rb') as f_in, open(replica_path, 'wb') as f_out:
        f_out.write(f_in.read())
    return output_path

def get_audio_duration(file_path):
    if not os.path.exists(file_path):
        return 5.0
    ffmpeg_bin = r"C:\tiktok\ffmpeg.exe" if os.path.exists(r"C:\tiktok\ffmpeg.exe") else "ffmpeg"
    cmd = [ffmpeg_bin, "-i", file_path]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    for line in res.stderr.splitlines():
        if "Duration:" in line:
            try:
                dur_str = line.split("Duration:")[1].split(",")[0].strip()
                parts = dur_str.split(":")
                if len(parts) == 3:
                    h, m, s = parts
                    return round(float(h) * 3600 + float(m) * 60 + float(s), 3)
            except Exception:
                pass
    return 5.0

def fallback_timecodes(audio_path, text):
    duracion = get_audio_duration(audio_path)
    palabras = text.split()
    if not palabras:
        return []
    tiempo_por_palabra = duracion / len(palabras)
    return [
        {
            "word": p,
            "start": round(i * tiempo_por_palabra, 3),
            "end": round((i + 1) * tiempo_por_palabra, 3)
        }
        for i, p in enumerate(palabras)
    ]

async def get_whisper_timecodes(session, audio_path, text):
    if not GROQ_API_KEY:
        return fallback_timecodes(audio_path, text)
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    try:
        with open(audio_path, 'rb') as f:
            file_bytes = f.read()
        data = aiohttp.FormData()
        data.add_field('file', file_bytes, filename=os.path.basename(audio_path), content_type='audio/mpeg')
        data.add_field('model', 'whisper-large-v3')
        data.add_field('response_format', 'verbose_json')
        data.add_field('timestamp_granularities[]', 'word')
        data.add_field('prompt', text)

        async with session.post(url, headers=headers, data=data) as response:
            if response.status == 200:
                res = await response.json()
                return res.get('words', [])
            else:
                return fallback_timecodes(audio_path, text)
    except Exception:
        return fallback_timecodes(audio_path, text)

async def process_scene(session, scene):
    id_escena = scene["id"]
    text = scene.get("text") or scene.get("narration") or ""
    
    audio_path = await generate_audio(id_escena, text)
    duration_sec = get_audio_duration(audio_path)
    duration_frames = max(1, int(round(duration_sec * FPS)))
    
    whisper_words = await get_whisper_timecodes(session, audio_path, text)
    
    words_formatted = []
    for w in whisper_words:
        palabra = w.get("word", "").strip().upper()
        if palabra:
            st = round(float(w.get("start", 0)), 3)
            en = round(float(w.get("end", st + 0.3)), 3)
            words_formatted.append({
                "word": palabra,
                "start": st,
                "end": en,
                "startFrame": int(round(st * FPS)),
                "endFrame": int(round(en * FPS))
            })

    scene["durationInSeconds"] = duration_sec
    scene["durationInFrames"] = duration_frames
    scene["words"] = words_formatted
    return scene

async def main():
    script_file = os.path.join(PROJECT_DIR, "script.json")
    with open(script_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    scenes = data if isinstance(data, list) else data.get("scenes", [])

    connector = aiohttp.TCPConnector(limit=10)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [process_scene(session, s) for s in scenes]
        escenas_procesadas = await asyncio.gather(*tasks)

    # Ordenar por ID
    escenas_procesadas.sort(key=lambda x: x["id"])

    # Guardar script enriquecido en projects y en public
    with open(script_file, 'w', encoding='utf-8') as f:
        json.dump(escenas_procesadas, f, ensure_ascii=False, indent=2)
    with open(os.path.join(OUTPUT_DIR, "script.json"), 'w', encoding='utf-8') as f:
        json.dump(escenas_procesadas, f, ensure_ascii=False, indent=2)

    print(f"Pipeline Atómico OK: {len(escenas_procesadas)} escenas procesadas y sincronizadas.")

if __name__ == "__main__":
    asyncio.run(main())
