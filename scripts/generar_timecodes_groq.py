#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
generar_timecodes_groq.py - Alineación Fonética Exacta con Groq Cloud Whisper API
Utiliza whisper-large-v3 en Groq LPU con timestamp_granularities[]=word
para obtener marcas de tiempo milimétricas a nivel de palabra sin consumo local de CPU/RAM.
"""

import os
import sys
import json
import math
import requests

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

PROJECT_DIR = r"C:\tiktok\projects\actual"
AUDIO_PATH = os.path.join(PROJECT_DIR, "audio_narracion.mp3")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "timecodes.json")
CONFIG_PATH = r"C:\tiktok\api_config.json"
PUBLIC_DIR = r"C:\tiktok\remotion\public"
FPS = 30

def obtener_groq_key():
    # 1. Variables de entorno
    for k in ["GROQ_API_KEY", "groq_api_key"]:
        key = os.environ.get(k, "").strip()
        if key and (key.startswith("gsk_") or len(key) > 15):
            return key

    # 2. api_config.json
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

def fallback_calibrador_acustico():
    print("[FALLBACK] Ejecutando calibrador fonético acústico de contingencia...")
    import subprocess
    cmd = [sys.executable, r"C:\tiktok\scripts\calibracion_fonetica.py"]
    subprocess.run(cmd, check=True)

def main():
    if not os.path.exists(AUDIO_PATH):
        print(f"[ERROR] No existe el archivo de audio en: {AUDIO_PATH}")
        sys.exit(1)

    groq_key = obtener_groq_key()
    if not groq_key:
        print("==================================================")
        print("[AVISO] No se encontró GROQ_API_KEY activa.")
        print("  Para activar Groq Whisper LPU, añade tu clave en C:\\tiktok\\api_config.json:")
        print("  \"groq_api_key\": \"gsk_...\"")
        print("==================================================")
        fallback_calibrador_acustico()
        return

    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {
        "Authorization": f"Bearer {groq_key}"
    }
    data = {
        "model": "whisper-large-v3",
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word",
        "language": "es"
    }

    print("==================================================")
    print("GROQ CLOUD WHISPER API - ALINEACIÓN ACÚSTICA LPU")
    print(f"  Audio: {AUDIO_PATH}")
    print("  Modelo: whisper-large-v3 (Word-Level Granularity)")
    print("==================================================")
    print("Enviando audio a Groq Cloud Whisper API...")

    try:
        with open(AUDIO_PATH, "rb") as f:
            files = {"file": ("audio_narracion.mp3", f, "audio/mpeg")}
            response = requests.post(url, headers=headers, data=data, files=files, timeout=60)

        if response.status_code != 200:
            print(f"[ERROR] Groq Whisper API respondió con código {response.status_code}: {response.text}")
            print("Activando fallback acústico...")
            fallback_calibrador_acustico()
            return

        result = response.json()
        words_data = result.get("words", [])
        if not words_data:
            print("[ADVERTENCIA] No se recibieron marcas de tiempo de palabras de Groq. Conmutando a fallback...")
            fallback_calibrador_acustico()
            return

        remotion_timecodes = []
        for w in words_data:
            start_time = float(w["start"])
            end_time = float(w["end"])
            palabra_limpia = w["word"].strip().upper()
            if not palabra_limpia:
                continue

            start_f = math.floor(start_time * FPS)
            end_f = max(start_f + 1, math.ceil(end_time * FPS))

            remotion_timecodes.append({
                "word": palabra_limpia,
                "raw": w["word"],
                "start": round(start_time, 3),
                "end": round(end_time, 3),
                "startFrame": start_f,
                "endFrame": end_f,
                "start_frame": start_f,
                "end_frame": end_f
            })

        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(remotion_timecodes, f, ensure_ascii=False, indent=2)

        # Copia automática al directorio público de Remotion
        os.makedirs(PUBLIC_DIR, exist_ok=True)
        with open(os.path.join(PUBLIC_DIR, "timecodes.json"), "w", encoding="utf-8") as f:
            json.dump(remotion_timecodes, f, ensure_ascii=False, indent=2)

        print(f"\n[OK] Alineación completada al 100%: {len(remotion_timecodes)} palabras mapeadas con precisión milimétrica.")
        print(f"  Timecodes guardados en: {OUTPUT_PATH}")

    except Exception as e:
        print(f"[ERROR] Excepción conectando con Groq: {e}")
        fallback_calibrador_acustico()

if __name__ == "__main__":
    main()
