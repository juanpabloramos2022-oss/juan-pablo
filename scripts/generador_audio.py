#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
generador_audio.py - Generador de Audio y Timecodes V33.8
Sintetiza la narración con Google Gemini 2.0 Flash Audio (o Edge-TTS como fallback de $0 USD)
y genera la Distribución Fonética Proporcional sin Whisper ni consumo de GPU.
"""

import os
import sys
import json
import base64
import asyncio
import subprocess
import shutil
import urllib.request
import urllib.error

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = r"C:\tiktok"
PROJECT_DIR = os.path.join(BASE_DIR, "projects", "actual")
SCRIPT_FILE = os.path.join(PROJECT_DIR, "script.json")
AUDIO_OUTPUT = os.path.join(PROJECT_DIR, "audio_narracion.mp3")
TIMECODES_OUTPUT = os.path.join(PROJECT_DIR, "timecodes.json")
PUBLIC_DIR = os.path.join(BASE_DIR, "remotion", "public")
FFMPEG_EXE = os.path.join(BASE_DIR, "ffmpeg.exe")
API_CONFIG_FILE = os.path.join(BASE_DIR, "api_config.json")

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
GEMINI_VOICE = "Charon"  # Voz profunda, magnética y cinematográfica

def resolve_gemini_key():
    for k in ["GEMINI_API_KEY", "GOOGLE_API_KEY"]:
        val = os.environ.get(k, "").strip()
        if val and not val.startswith("TU_") and len(val) > 15:
            return val

    if os.path.exists(API_CONFIG_FILE):
        try:
            with open(API_CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                val = (cfg.get("gemini_api_key") or cfg.get("google_api_key") or "").strip()
                if val and not val.startswith("TU_") and len(val) > 15:
                    return val
        except Exception:
            pass

    return None

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
                return round(float(h) * 3600 + float(m) * 60 + float(s), 3)
    except Exception:
        pass
    return 0.0

def synthesize_gemini(text: str, output_path: str, api_key: str) -> float:
    headers = {"Content-Type": "application/json"}
    prompt_content = (
        "Instruction: You are an elite cinematic Spanish documentary narrator. "
        "Speak in Spanish with a dark, tense, gripping biological suspense. Low pitch, intense micro-pauses. "
        f"Read ONLY this exact text with that acting: \"{text}\""
    )

    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt_content}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": GEMINI_VOICE}
                }
            }
        }
    }

    url = f"{GEMINI_API_URL}?key={api_key}"
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")

    with urllib.request.urlopen(req, timeout=30) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))

    part = res_data["candidates"][0]["content"]["parts"][0]
    inline = part.get("inlineData", {})
    mime = inline.get("mimeType", "audio/pcm;rate=24000")
    b64_audio = inline.get("data", "")

    if not b64_audio:
        raise ValueError("Gemini no devolvió datos de audio.")

    raw_audio = base64.b64decode(b64_audio)

    # Transcodificación directa en memoria con FFmpeg
    if "pcm" in mime:
        cmd = [
            FFMPEG_EXE, "-y",
            "-f", "s16le", "-ar", "24000", "-ac", "1",
            "-i", "pipe:0",
            "-c:a", "libmp3lame", "-b:a", "192k",
            output_path
        ]
    else:
        cmd = [
            FFMPEG_EXE, "-y",
            "-i", "pipe:0",
            "-c:a", "libmp3lame", "-b:a", "192k",
            output_path
        ]

    subprocess.run(cmd, input=raw_audio, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    return get_audio_duration(output_path)

async def synthesize_edge_tts(text: str, output_path: str, voice: str = "es-ES-AlvaroNeural") -> float:
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate="+0%")
    await comm.save(output_path)
    return get_audio_duration(output_path)

def generate_proportional_timecodes(full_text: str, total_duration: float):
    """
    Distribución Fonética Proporcional V33.8 (0% Whisper, 0 MB RAM IA).
    Calcula pesos basados en fonemas vocálicos, longitud silábica y pausas gramaticales.
    """
    import re
    # Limpiar y separar palabras
    raw_words = full_text.split()
    if not raw_words or total_duration <= 0:
        return []

    word_items = []
    weights = []

    for rw in raw_words:
        clean = re.sub(r'[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]', '', rw).upper()
        if not clean:
            clean = rw.upper()

        # Cálculo de peso fonético
        length = len(clean)
        vowels = sum(1 for c in clean.lower() if c in "aeiouáéíóúü")
        has_punctuation = any(p in rw for p in [".", ",", ";", ":", "!", "?", "—"])
        pause_bonus = 3.5 if has_punctuation else 0.0

        weight = max(1.0, length + (vowels * 1.5) + pause_bonus)
        weights.append(weight)
        word_items.append({"raw": rw, "word": clean})

    total_weight = sum(weights)
    current_time = 0.0
    timecodes = []

    for i, item in enumerate(word_items):
        ratio = weights[i] / total_weight
        duration = total_duration * ratio
        start_t = round(current_time, 3)
        end_t = round(current_time + duration, 3)

        # Garantizar coherencia estricta
        if end_t <= start_t:
            end_t = round(start_t + 0.05, 3)

        timecodes.append({
            "word": item["word"],
            "raw": item["raw"],
            "start": start_t,
            "end": end_t,
            "start_frame": int(start_t * 30),
            "end_frame": max(int(start_t * 30) + 1, int(end_t * 30))
        })
        current_time = end_t

    # Ajustar el último timecode exactamente al final
    if timecodes:
        timecodes[-1]["end"] = round(total_duration, 3)
        timecodes[-1]["end_frame"] = int(total_duration * 30)

    return timecodes

def main():
    if not os.path.exists(SCRIPT_FILE):
        print(f"[ERROR] No se encontró el guion en: {SCRIPT_FILE}")
        sys.exit(1)

    with open(SCRIPT_FILE, "r", encoding="utf-8") as f:
        script_data = json.load(f)

    scenes = script_data.get("scenes", [])
    if not scenes:
        print("[ERROR] script.json no contiene escenas.")
        sys.exit(1)

    # Extraer y concatenar la narración de todas las escenas con micro-pausas
    narrations = []
    for sc in scenes:
        text = sc.get("narration_es") or sc.get("narration") or sc.get("text") or ""
        if text.strip():
            narrations.append(text.strip())

    full_narration = " ... ".join(narrations)

    api_key = resolve_gemini_key()

    print("==================================================")
    print("FACTORÍA V33.8 - GENERADOR DE AUDIO Y TIMECODES")
    print(f"  Total Escenas a narrar: {len(narrations)}")
    print(f"  Gemini Audio API Key: {'Configurada' if api_key else 'No detectada (Usando Edge-TTS)'}")
    print("==================================================")

    duration = 0.0
    provider = "Desconocido"

    # 1. Intentar con Google Gemini 2.0 Flash Audio
    if api_key:
        print(f"[AUDIO] Solicitando síntesis a Gemini 2.0 Flash Audio ({GEMINI_VOICE})...")
        try:
            duration = synthesize_gemini(full_narration, AUDIO_OUTPUT, api_key)
            provider = f"Google Gemini ({GEMINI_VOICE})"
            print(f"[AUDIO] Síntesis en Gemini completada exitosamente ({duration:.2f}s).")
        except Exception as e:
            print(f"[AUDIO] Aviso: Gemini Audio falló ({e}). Conmutando a Edge-TTS...")

    # 2. Fallback a Edge-TTS (Alvaro Neural de $0 USD)
    if duration <= 0:
        print("[AUDIO] Ejecutando Edge-TTS Fallback (es-ES-AlvaroNeural)...")
        try:
            duration = asyncio.run(synthesize_edge_tts(full_narration, AUDIO_OUTPUT, "es-ES-AlvaroNeural"))
            provider = "Edge-TTS (es-ES-AlvaroNeural)"
            print(f"[AUDIO] Síntesis en Edge-TTS completada ({duration:.2f}s).")
        except Exception as e:
            print(f"[AUDIO] Fallo en Edge-TTS: {e}")
            print("[AUDIO] Generando tono de contingencia con FFmpeg...")
            cmd = [
                FFMPEG_EXE, "-y",
                "-f", "lavfi", "-i", "sine=frequency=440:duration=4",
                "-q:a", "9", "-acodec", "libmp3lame",
                AUDIO_OUTPUT
            ]
            subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            duration = 4.0
            provider = "FFmpeg Contingency Sine"

    # 3. Distribución Fonética Proporcional
    print(f"[FONÉTICA] Calculando distribución fonética proporcional para {duration:.2f}s de audio...")
    timecodes = generate_proportional_timecodes(full_narration, duration)

    with open(TIMECODES_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(timecodes, f, indent=2, ensure_ascii=False)

    print(f"[FONÉTICA] {len(timecodes)} timecodes generados exitosamente en {TIMECODES_OUTPUT}")

    # 4. Sincronización a Remotion Public
    os.makedirs(PUBLIC_DIR, exist_ok=True)
    shutil.copy2(AUDIO_OUTPUT, os.path.join(PUBLIC_DIR, "audio_narracion.mp3"))
    shutil.copy2(TIMECODES_OUTPUT, os.path.join(PUBLIC_DIR, "timecodes.json"))
    shutil.copy2(SCRIPT_FILE, os.path.join(PUBLIC_DIR, "script.json"))
    print(f"[SYNC] Assets sincronizados a {PUBLIC_DIR}")

    print("\n[OK] GENERACIÓN AUDIOVISUAL COMPLETADA:")
    print(f"  Archivo de audio: {AUDIO_OUTPUT} ({duration:.2f}s | {provider})")
    print(f"  Archivo de timecodes: {TIMECODES_OUTPUT} ({len(timecodes)} palabras sincronizadas)")

if __name__ == "__main__":
    main()
