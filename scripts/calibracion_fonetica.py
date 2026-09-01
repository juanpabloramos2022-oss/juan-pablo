import subprocess
import re
import json
import os
import math

PROJECT_DIR = r"C:\tiktok\projects\actual"
AUDIO_PATH = os.path.join(PROJECT_DIR, "audio_narracion.mp3")
SCRIPT_PATH = os.path.join(PROJECT_DIR, "script.json")
OUTPUT_PATH = os.path.join(PROJECT_DIR, "timecodes.json")

def detectar_silencios_ffmpeg(audio_path, noise_db="-30dB", min_duration="0.25"):
    command = [
        r"C:\tiktok\ffmpeg.exe", "-i", audio_path,
        "-af", f"silencedetect=noise={noise_db}:d={min_duration}",
        "-f", "null", "-"
    ]
    result = subprocess.run(command, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    output = result.stderr
    starts = re.findall(r"silence_start: (\d+\.?\d*)", output)
    ends = re.findall(r"silence_end: (\d+\.?\d*)", output)
    return [(float(s), float(e)) for s, e in zip(starts, ends)]

def contar_silabas(palabra):
    p = re.sub(r'[^a-záéíóúüñ]', '', palabra.lower())
    return max(1, len(re.findall(r'[aeiouáéíóúü]+', p)))

def obtener_duracion(audio_path):
    cmd = [r"C:\tiktok\ffmpeg.exe", "-i", audio_path]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    for line in res.stderr.splitlines():
        if "Duration:" in line:
            dur_str = line.split("Duration:")[1].split(",")[0].strip()
            parts = dur_str.split(":")
            if len(parts) == 3:
                h, m, s = parts
                return round(float(h) * 3600 + float(m) * 60 + float(s), 3)
    return 63.53

def main():
    if not os.path.exists(AUDIO_PATH) or not os.path.exists(SCRIPT_PATH):
        print("Faltan archivos requeridos en", PROJECT_DIR)
        return

    duracion_total = obtener_duracion(AUDIO_PATH)
    silencios = detectar_silencios_ffmpeg(AUDIO_PATH)

    with open(SCRIPT_PATH, 'r', encoding='utf-8') as f:
        script_data = json.load(f)

    # Extraer texto completo de las escenas soportando array u objeto con propiedad scenes
    scenes = script_data.get("scenes", []) if isinstance(script_data, dict) else script_data
    if not isinstance(scenes, list):
        scenes = []

    narraciones = []
    for s in scenes:
        if isinstance(s, dict):
            txt = s.get("narration_es") or s.get("narration") or s.get("texto") or s.get("voiceover") or s.get("text") or ""
            if txt.strip():
                narraciones.append(txt.strip())

    texto_completo = " ".join(narraciones)
    palabras_raw = texto_completo.split()

    if not palabras_raw:
        print("No se encontraron palabras para calibrar.")
        return

    # Construir bloques de voz invirtiendo silencios
    bloques_voz = []
    t_curr = 0.0
    for s_start, s_end in silencios:
        if s_start > t_curr:
            bloques_voz.append((t_curr, s_start))
        t_curr = s_end
    if t_curr < duracion_total:
        bloques_voz.append((t_curr, duracion_total))

    if not bloques_voz:
        bloques_voz = [(0.0, duracion_total)]

    subtitulos = []
    fps = 30
    
    # Asignación de palabras a bloques temporales de forma proporcional
    total_palabras = len(palabras_raw)
    palabras_por_bloque = max(1, math.ceil(total_palabras / len(bloques_voz)))

    idx_palabra = 0
    for b_inicio, b_fin in bloques_voz:
        dur_bloque = b_fin - b_inicio
        bloque_palabras = palabras_raw[idx_palabra : idx_palabra + palabras_por_bloque]
        idx_palabra += len(bloque_palabras)
        if not bloque_palabras:
            break

        total_silabas = sum(contar_silabas(p) for p in bloque_palabras)
        t_cursor = b_inicio

        for p in bloque_palabras:
            p_limpia = re.sub(r'[^\wáéíóúüñÁÉÍÓÚÜÑ]', '', p)
            if not p_limpia:
                p_limpia = p
            dur_p = dur_bloque * (contar_silabas(p) / total_silabas)
            t_fin = t_cursor + dur_p
            start_f = int(round(t_cursor * fps))
            end_f = max(start_f + 1, int(round(t_fin * fps)))
            subtitulos.append({
                "word": p_limpia.upper(),
                "raw": p,
                "start": round(t_cursor, 3),
                "end": round(t_fin, 3),
                "startFrame": start_f,
                "endFrame": end_f,
                "start_frame": start_f,
                "end_frame": end_f
            })
            t_cursor = t_fin

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(subtitulos, f, ensure_ascii=False, indent=2)

    print(f"Calibración acústica completada: {len(subtitulos)} palabras ancladas con FFmpeg.")

if __name__ == "__main__":
    main()
