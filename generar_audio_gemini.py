#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Motor de Voces Hiperrealistas con Google AI Studio (Gemini 2.0 Flash Audio)
Factoría TikTok V33.7 - Arquitectura Nativa Ligera para Windows (i5, 8GB RAM).
- Síntesis REST directa sin SDKs pesados.
- Transcodificación en memoria PCM/WAV -> MP3 con FFmpeg.
- Subtítulos dinámicos ASS ponderados por fonética y prosodia.
- Fallback automático e instantáneo a Edge-TTS ante agotamiento de cuota.
"""
import os
import sys
import json
import base64
import asyncio
import urllib.request
import urllib.error
import subprocess
import shutil

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_TIKTOK = r"C:\tiktok"
GLOBAL_AUDIO_DIR = os.path.join(BASE_TIKTOK, "audio")
FFMPEG_EXE = os.path.join(BASE_TIKTOK, "ffmpeg.exe")
API_CONFIG_FILE = os.path.join(BASE_TIKTOK, "api_config.json")
CURRENT_PROJECT_FILE = os.path.join(BASE_TIKTOK, "current_project.txt")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Mapeo de Voces Gemini
GEMINI_VOICES = {
    "charon": "Charon",      # Masculino grave, suspenso, misterio, conspiraciones
    "puck": "Puck",          # Masculino enérgico, ritmo viral, dinámico
    "kore": "Kore",          # Femenino cinematográfico, psicología, ciencia
    "fenrir": "Fenrir",      # Masculino autoritario, documental crudo, historia
    "aoede": "Aoede"         # Femenino dramático, expresivo
}

def resolve_gemini_api_key() -> str:
    # 1. Variable de entorno
    for k in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]:
        val = os.environ.get(k)
        if val and val.strip() and not val.strip().startswith("TU_") and len(val.strip()) > 15:
            return val.strip()

    # 2. api_config.json
    if os.path.exists(API_CONFIG_FILE):
        try:
            with open(API_CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                k = cfg.get("gemini_api_key") or cfg.get("google_api_key")
                if k and isinstance(k, str) and not k.startswith("TU_") and len(k.strip()) > 15:
                    return k.strip()
        except Exception:
            pass

    # 3. Archivo .env
    env_paths = [os.path.join(BASE_TIKTOK, ".env"), os.path.join(BASE_TIKTOK, "config", ".env"), ".env"]
    for path in env_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GEMINI_API_KEY=") or line.startswith("GOOGLE_API_KEY="):
                            k = line.split("=", 1)[1].strip().strip('"').strip("'")
                            if k and not k.startswith("TU_") and len(k) > 15:
                                return k
            except Exception:
                pass
    return None

def resolve_project_dir(custom_path: str = None) -> str:
    if custom_path and os.path.isdir(custom_path):
        return os.path.abspath(custom_path)
    if os.path.exists(CURRENT_PROJECT_FILE):
        try:
            with open(CURRENT_PROJECT_FILE, "r", encoding="utf-8") as f:
                p = f.read().strip()
                if os.path.isdir(p):
                    return os.path.abspath(p)
        except Exception:
            pass
    return BASE_TIKTOK

def get_audio_duration(file_path: str) -> float:
    if not os.path.exists(file_path) or os.path.getsize(file_path) == 0:
        return 0.0
    try:
        cmd = [FFMPEG_EXE, "-i", file_path]
        proc = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="ignore")
        for line in proc.stderr.splitlines():
            if "Duration:" in line:
                dur_str = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = dur_str.split(":")
                return round(float(h) * 3600 + float(m) * 60 + float(s), 2)
    except Exception:
        pass
    return 0.0

def get_tone_direction(niche: str) -> str:
    low = (niche or "").lower()
    if "misterio" in low or "terror" in low or "horror" in low or "dark" in low:
        return "Speak in Spanish with a dark, tense, cinematic suspense. Low pitch, breathy whisper cadence, intense micro-pauses before shocking words."
    elif "finanzas" in low or "dinero" in low or "crypto" in low:
        return "Speak in Spanish with decisive authority, punchy rhythm, corporate gravitas, and high urgency."
    elif "ciencia" in low or "psicolog" in low:
        return "Speak in Spanish with fascinating scientific curiosity, crisp articulation, and deliberate dramatic pauses."
    elif "historia" in low or "guerra" in low:
        return "Speak in Spanish with solemn historical realism, weighty narration, and epic documentary gravitas."
    else:
        return "Speak in Spanish with magnetic viral cadence, intense drama, and suspenseful rhythm."

def synthesize_gemini_audio_rest(text: str, output_path: str, voice_name: str, niche: str, api_key: str) -> float:
    """Llamada REST directa a Gemini 2.0 Flash Audio (sin SDKs pesados, ultra-liviano)."""
    headers = {
        "Content-Type": "application/json"
    }

    voice_id = GEMINI_VOICES.get(voice_name.lower(), voice_name)
    tone_instruction = get_tone_direction(niche)

    prompt_content = f"Instruction: You are an elite cinematic Spanish voice actor. {tone_instruction} Read ONLY the following text with that exact emotional acting. Do NOT add greetings, comments or extra words. Text to read: \"{text}\""

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt_content}]
            }
        ],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {
                        "voiceName": voice_id
                    }
                }
            }
        }
    }

    url = f"{GEMINI_API_URL}?key={api_key}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")

    with urllib.request.urlopen(req, timeout=20) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))

    # Extraer audio binario en inlineData
    part = res_data["candidates"][0]["content"]["parts"][0]
    inline = part.get("inlineData", {})
    mime = inline.get("mimeType", "audio/pcm;rate=24000")
    b64_audio = inline.get("data", "")

    if not b64_audio:
        raise ValueError("La respuesta de Gemini no incluyo datos de audio binarios.")

    raw_audio = base64.b64decode(b64_audio)

    # Transcodificar directamente a MP3 mediante FFmpeg en RAM
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    if "pcm" in mime:
        # Formato nativo de Gemini 2.0 Flash: PCM 16-bit little-endian 24kHz mono
        cmd = [
            FFMPEG_EXE, "-y",
            "-f", "s16le",
            "-ar", "24000",
            "-ac", "1",
            "-i", "pipe:0",
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            output_path
        ]
    else:
        cmd = [
            FFMPEG_EXE, "-y",
            "-i", "pipe:0",
            "-c:a", "libmp3lame",
            "-b:a", "192k",
            output_path
        ]

    proc = subprocess.run(cmd, input=raw_audio, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return get_audio_duration(output_path)

async def fallback_edge_tts(text: str, output_path: str, voice: str = "es-ES-AlvaroNeural") -> float:
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate="+0%")
    await comm.save(output_path)
    return get_audio_duration(output_path)

def generate_voice_smart(text: str, output_path: str, voice_name: str, niche: str, api_key: str = None) -> (float, str):
    """Genera audio con Gemini 2.0 Flash con conmutacion automatica a Edge-TTS si no hay cuota o clave."""
    key = api_key or resolve_gemini_api_key()
    
    # 1. Intentar con Google AI Studio si hay clave
    if key and not key.startswith("TU_"):
        try:
            dur = synthesize_gemini_audio_rest(text, output_path, voice_name, niche, key)
            if dur > 0:
                return dur, f"Google AI Studio ({voice_name})"
        except Exception as e:
            print(f"  [Aviso Gemini Audio]: {e}. Conmutando a Edge-TTS...")

    # 2. Fallback instantaneo a Edge-TTS
    edge_voice = "es-ES-AlvaroNeural" if "alvaro" in voice_name.lower() or voice_name in ["Puck", "Charon", "Fenrir"] else "es-MX-JorgeNeural"
    dur = asyncio.run(fallback_edge_tts(text, output_path, voice=edge_voice))
    return dur, f"Edge-TTS Fallback ({edge_voice})"

def format_ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def calculate_weighted_subtitles(scene_timings: list) -> list:
    """
    Algoritmo Ligero de Calibración Fonética y Prosódica:
    Distribuye los subtítulos dinámicos proporcionalmente según longitud de sílabas y puntuación,
    garantizando 0% uso de GPU y 0 MB de RAM adicional.
    """
    dialogues = []
    for item in scene_timings:
        start_t = item["start_time"]
        total_dur = item["duration"]
        text = item["text"].strip()
        words = text.split()
        if not words or total_dur <= 0:
            continue

        chunks = []
        chunk_size = 2 if len(words) <= 5 else 3
        for i in range(0, len(words), chunk_size):
            chunks.append(" ".join(words[i:i+chunk_size]))

        # Calcular peso fonetico de cada chunk
        weights = []
        for ch in chunks:
            raw_len = len(ch)
            # Vocales y pausas aumentan duracion fonetica
            vowels = sum(1 for c in ch.lower() if c in "aeiouáéíóú")
            bonus = 3 if any(p in ch for p in [",", ".", ";", ":", "..."]) else 0
            w = raw_len + (vowels * 1.2) + bonus
            weights.append(max(1.0, w))

        total_weight = sum(weights)
        curr_chunk_start = start_t

        for idx, chunk in enumerate(chunks):
            ratio = weights[idx] / total_weight
            chunk_dur = round(total_dur * ratio, 2)
            chunk_end = round(curr_chunk_start + chunk_dur, 2)
            
            style = "TikTokYellow" if idx % 2 == 0 else "TikTokWhite"
            clean_chunk = chunk.upper().replace('"', '').replace(',', '').replace('.', '')
            
            dialogues.append(
                f"Dialogue: 0,{format_ass_time(curr_chunk_start)},{format_ass_time(chunk_end)},{style},,0,0,0,,{clean_chunk}"
            )
            curr_chunk_start = chunk_end

    return dialogues

def build_ass_file(dialogues: list, output_ass_path: str):
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: TikTokYellow,Arial Black,64,&H0000FFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,8,4,2,40,40,460,1
Style: TikTokWhite,Arial Black,64,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,1,0,1,8,4,2,40,40,460,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    with open(output_ass_path, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(dialogues) + "\n")

async def process_scene_concurrent(sem: asyncio.Semaphore, sc: dict, audio_dir: str, voice_name: str, niche: str, api_key: str):
    async with sem:
        loop = asyncio.get_running_loop()
        s_num = sc["scene_number"]
        p = f"{s_num:04d}"
        narr = sc["text"]
        out_f = os.path.join(audio_dir, f"voice_scene_{p}.mp3")
        
        # Ejecutar generacion en hilo para no bloquear el bucle de eventos
        dur, provider = await loop.run_in_executor(None, generate_voice_smart, narr, out_f, voice_name, niche, api_key)
        
        # Mirror al directorio global
        try:
            os.makedirs(GLOBAL_AUDIO_DIR, exist_ok=True)
            shutil.copy2(out_f, os.path.join(GLOBAL_AUDIO_DIR, f"voice_scene_{p}.mp3"))
        except Exception:
            pass

        return {
            "scene_number": s_num,
            "text": narr,
            "duration": dur,
            "audio_file": out_f,
            "provider": provider
        }

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Motor de Locución Gemini Audio / Edge-TTS (V33.7)")
    parser.add_argument("--project-dir", default=None, help="Directorio del proyecto")
    parser.add_argument("--voice", default="Charon", help="Voz de Google AI Studio (Charon, Puck, Kore, Fenrir, Aoede)")
    parser.add_argument("--concurrency", type=int, default=3, help="Concurrencia máxima para respetar rate limit de Gemini")
    args = parser.parse_args()

    proj_dir = resolve_project_dir(args.project_dir)
    audio_dir = os.path.join(proj_dir, "audio")
    os.makedirs(audio_dir, exist_ok=True)
    script_path = os.path.join(proj_dir, "script.json")

    if not os.path.exists(script_path):
        print(f"[Error] No se encontró script.json en {proj_dir}")
        sys.exit(1)

    with open(script_path, "r", encoding="utf-8-sig") as f:
        script_data = json.load(f)

    meta = script_data.get("project_meta", {})
    scenes = script_data.get("scenes") or []
    niche = meta.get("niche", "Misterio")
    voice_name = args.voice or meta.get("voice_profile", "Charon")
    api_key = resolve_gemini_api_key()

    print("==================================================")
    print("MOTOR DE VOCES HIPERREALISTAS GOOGLE AI STUDIO (V33.7)")
    print(f"  Proyecto: {os.path.basename(proj_dir)}")
    print(f"  Voz Seleccionada: {voice_name}")
    print(f"  Gemini API Key: {'Configurada' if api_key else 'No detectada (Modo Fallback)'}")
    print(f"  Total Escenas: {len(scenes)}")
    print("==================================================")

    # 1. Preparar escenas a procesar
    scenes_to_process = []
    # Escena 1 Hook A
    sc1 = scenes[0]
    hook_a_text = sc1.get("narration") or "Inicio del video"
    hook_b_text = sc1.get("hook_b") or "Apertura alternativa"

    scenes_to_process.append({"scene_number": 1, "text": hook_a_text, "is_hook_b": False})
    
    for i in range(1, len(scenes)):
        sc = scenes[i]
        scenes_to_process.append({
            "scene_number": int(sc.get("scene_number", i + 1)),
            "text": sc.get("narration") or "",
            "is_hook_b": False
        })

    # 2. Despacho asíncrono con control de concurrencia
    sem = asyncio.Semaphore(args.concurrency)
    
    async def run_all():
        tasks = [process_scene_concurrent(sem, sc, audio_dir, voice_name, niche, api_key) for sc in scenes_to_process]
        return await asyncio.gather(*tasks)

    results = asyncio.run(run_all())
    results.sort(key=lambda x: x["scene_number"])

    # También sintetizar hook_b para escena 1
    hook_b_file = os.path.join(audio_dir, "voice_scene_0001_b.mp3")
    dur_hook_b, prov_b = generate_voice_smart(hook_b_text, hook_b_file, voice_name, niche, api_key)
    try:
        shutil.copy2(hook_b_file, os.path.join(GLOBAL_AUDIO_DIR, "voice_scene_0001_b.mp3"))
    except Exception:
        pass

    # 3. Compilación de Subtítulos Dinámicos ASS Ponderados
    timings_a = []
    curr_time = 0.0
    for r in results:
        timings_a.append({
            "scene_number": r["scene_number"],
            "text": r["text"],
            "start_time": curr_time,
            "duration": r["duration"]
        })
        print(f"  [Escena {r['scene_number']}] {r['duration']}s | {r['provider']} | \"{r['text'][:50]}...\"")
        curr_time = round(curr_time + r["duration"] + 0.30, 2)

    sub_dialogues = calculate_weighted_subtitles(timings_a)
    sub_master_path = os.path.join(audio_dir, "subtitles.ass")
    sub_hook_a_path = os.path.join(audio_dir, "subtitles_hookA.ass")
    build_ass_file(sub_dialogues, sub_master_path)
    build_ass_file(sub_dialogues, sub_hook_a_path)

    # Subtítulos Hook B
    timings_b = [{"scene_number": 1, "text": hook_b_text, "start_time": 0.0, "duration": dur_hook_b}]
    curr_t_b = round(dur_hook_b + 0.30, 2)
    for r in results[1:]:
        timings_b.append({
            "scene_number": r["scene_number"],
            "text": r["text"],
            "start_time": curr_t_b,
            "duration": r["duration"]
        })
        curr_t_b = round(curr_t_b + r["duration"] + 0.30, 2)
    sub_b_dialogues = calculate_weighted_subtitles(timings_b)
    build_ass_file(sub_b_dialogues, os.path.join(audio_dir, "subtitles_hookB.ass"))

    # Actualizar duraciones reales en script.json
    for sc in scenes:
        s_num = int(sc.get("scene_number", 1))
        matching = next((r for r in results if r["scene_number"] == s_num), None)
        if matching:
            sc["duracion_estimada_segundos"] = matching["duration"]

    with open(script_path, "w", encoding="utf-8") as f:
        json.dump(script_data, f, indent=2, ensure_ascii=False)

    print("\n[OK] Sintesis de voz completa y subtitulos sincronizados con exito.")

if __name__ == "__main__":
    main()
