#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
pipeline_atomico.py - Pipeline Asíncrono de 12 Audios y Timecodes Atómicos V33.8
Sintetiza 12 audios independientes (audio_1.mp3 a audio_12.mp3), mide su duración exacta con FFmpeg,
obtiene timecodes palabra por palabra mediante Groq Whisper Cloud (con fallback proporcional acústico)
y enriquece script.json con duraciones milimétricas y palabras relativas por escena.
"""

import os
import sys
import json
import math
import re
import shutil
import asyncio
import subprocess
import requests
import edge_tts

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = r"C:\tiktok"
PROJECT_DIR = os.path.join(BASE_DIR, "projects", "actual")
AUDIO_DIR = os.path.join(PROJECT_DIR, "audio")
PUBLIC_AUDIO_DIR = os.path.join(BASE_DIR, "remotion", "public", "audio")
SCRIPT_PATH = os.path.join(PROJECT_DIR, "script.json")
PUBLIC_SCRIPT_PATH = os.path.join(BASE_DIR, "remotion", "public", "script.json")
CONFIG_PATH = os.path.join(BASE_DIR, "api_config.json")
FFMPEG_BIN = os.path.join(BASE_DIR, "ffmpeg.exe")
FPS = 30
TTS_VOICE = "es-ES-AlvaroNeural"

def obtener_groq_key():
    for k in ["GROQ_API_KEY", "groq_api_key"]:
        key = os.environ.get(k, "").strip()
        if key and (key.startswith("gsk_") or len(key) > 15):
            return key
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                cfg = json.load(f)
                for k in ["GROQ_API_KEY", "groq_api_key", "api_key"]:
                    key = (cfg.get(k) or "").strip()
                    if key and (key.startswith("gsk_") or len(key) > 15):
                        return key
        except Exception:
            pass
    return ""

def get_audio_duration_ffmpeg(file_path):
    try:
        cmd = [FFMPEG_BIN, "-i", file_path]
        res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="replace")
        m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", res.stderr)
        if m:
            h, mn, s = m.groups()
            return round(int(h) * 3600 + int(mn) * 60 + float(s), 3)
    except Exception as e:
        print(f"  [AVISO] No se pudo medir duración con FFmpeg: {e}")
    return 5.0

async def sintetizar_escena(scene_id, text, output_path):
    communicate = edge_tts.Communicate(text, TTS_VOICE)
    await communicate.save(output_path)

def obtener_timecodes_groq(audio_path, groq_key):
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {groq_key}"}
    data = {
        "model": "whisper-large-v3",
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word",
        "language": "es"
    }

    with open(audio_path, "rb") as f:
        files = {"file": (os.path.basename(audio_path), f, "audio/mpeg")}
        response = requests.post(url, headers=headers, data=data, files=files, timeout=30)

    if response.status_code == 200:
        result = response.json()
        words_data = result.get("words", [])
        if words_data:
            words = []
            for w in words_data:
                st = float(w["start"])
                en = float(w["end"])
                word_clean = w["word"].strip().upper()
                if not word_clean:
                    continue
                s_frame = math.floor(st * FPS)
                e_frame = max(s_frame + 1, math.ceil(en * FPS))
                words.append({
                    "word": word_clean,
                    "start": round(st, 3),
                    "end": round(en, 3),
                    "startFrame": s_frame,
                    "endFrame": e_frame
                })
            return words
    return None

def generar_timecodes_proporcionales(text, duration_sec):
    raw_words = [w.strip().upper() for w in text.split() if w.strip()]
    if not raw_words:
        return []

    # Margen inicial de 0.08s y final de 0.15s
    start_margin = 0.08
    end_margin = max(start_margin + 0.5, duration_sec - 0.12)
    usable_time = max(0.4, end_margin - start_margin)

    # Ponderación silábica según longitud de palabra
    weights = [max(1, len(w)) for w in raw_words]
    total_weight = sum(weights)

    words = []
    current_time = start_margin
    for i, w in enumerate(raw_words):
        w_dur = (weights[i] / total_weight) * usable_time
        st = current_time
        en = min(duration_sec, current_time + w_dur)
        current_time = en

        s_frame = math.floor(st * FPS)
        e_frame = max(s_frame + 1, math.ceil(en * FPS))

        words.append({
            "word": w,
            "start": round(st, 3),
            "end": round(en, 3),
            "startFrame": s_frame,
            "endFrame": e_frame
        })

    return words

async def procesar_pipeline():
    if not os.path.exists(SCRIPT_PATH):
        print(f"[ERROR] No existe {SCRIPT_PATH}. Ejecuta generador_guion.py primero.")
        sys.exit(1)

    with open(SCRIPT_PATH, "r", encoding="utf-8") as f:
        script_data = json.load(f)

    scenes = script_data if isinstance(script_data, list) else script_data.get("scenes", [])
    if not scenes:
        print("[ERROR] script.json no contiene escenas.")
        sys.exit(1)

    os.makedirs(AUDIO_DIR, exist_ok=True)
    os.makedirs(PUBLIC_AUDIO_DIR, exist_ok=True)

    print("==================================================")
    print("PIPELINE ASÍNCRONO DE 12 AUDIOS ATÓMICOS V33.8")
    print(f"  Total escenas: {len(scenes)}")
    print(f"  Voz de síntesis: {TTS_VOICE}")
    print("==================================================")

    groq_key = obtener_groq_key()
    if groq_key:
        print("[GROQ] Whisper LPU activado para marcas de tiempo por palabra.")
    else:
        print("[AVISO] Sin GROQ_API_KEY. Usando alineador proporcional acústico ($0 USD).")

    # 1. Síntesis asíncrona concurrente de los 12 audios
    print("\n[1/3] Sintetizando 12 micro-audios atómicos concurrentes...")
    tasks = []
    for sc in scenes:
        scene_id = sc.get("id") or sc.get("scene_number", 1)
        text = sc.get("text") or sc.get("narration_es", "")
        out_file = os.path.join(AUDIO_DIR, f"audio_{scene_id}.mp3")
        tasks.append(sintetizar_escena(scene_id, text, out_file))

    await asyncio.gather(*tasks)
    print("  [OK] Todos los audios atómicos fueron sintetizados.")

    # 2. Medición precisa y Timecodes para cada escena
    print("\n[2/3] Midiendo duraciones exactas con FFmpeg y extrayendo timecodes...")
    total_duration = 0.0

    for sc in scenes:
        scene_id = sc.get("id") or sc.get("scene_number", 1)
        text = sc.get("text") or sc.get("narration_es", "")
        audio_file = os.path.join(AUDIO_DIR, f"audio_{scene_id}.mp3")
        public_audio_file = os.path.join(PUBLIC_AUDIO_DIR, f"audio_{scene_id}.mp3")

        # Copia al directorio público de Remotion
        shutil.copy2(audio_file, public_audio_file)

        # Medir duración exacta
        dur = get_audio_duration_ffmpeg(audio_file)
        sc["durationInSeconds"] = dur
        sc["durationInFrames"] = max(1, round(dur * FPS))
        total_duration += dur

        # Timecodes
        words = None
        if groq_key:
            try:
                words = obtener_timecodes_groq(audio_file, groq_key)
            except Exception as e:
                print(f"  [AVISO] Falló Groq Whisper en escena {scene_id}: {e}")

        if not words:
            words = generar_timecodes_proporcionales(text, dur)

        sc["words"] = words
        print(f"  Escena {scene_id:02d}: {dur:.2f}s ({sc['durationInFrames']} frames) | {len(words)} palabras alineadas")

    # 3. Guardar script.json enriquecido
    print(f"\n[3/3] Guardando script.json enriquecido (Duración total: {total_duration:.2f}s / {round(total_duration * FPS)} frames)...")
    if isinstance(script_data, dict):
        script_data["scenes"] = scenes
        script_data["totalDurationInSeconds"] = round(total_duration, 3)
        script_data["totalDurationInFrames"] = round(total_duration * FPS)
    else:
        script_data = {
            "scenes": scenes,
            "totalDurationInSeconds": round(total_duration, 3),
            "totalDurationInFrames": round(total_duration * FPS)
        }

    with open(SCRIPT_PATH, "w", encoding="utf-8") as f:
        json.dump(script_data, f, ensure_ascii=False, indent=2)

    with open(PUBLIC_SCRIPT_PATH, "w", encoding="utf-8") as f:
        json.dump(script_data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Pipeline atómico completado exitosamente.")
    print(f"  - Audios en: {AUDIO_DIR} y {PUBLIC_AUDIO_DIR}")
    print(f"  - script.json actualizado en {SCRIPT_PATH} y {PUBLIC_SCRIPT_PATH}")

def main():
    asyncio.run(procesar_pipeline())

if __name__ == "__main__":
    main()
