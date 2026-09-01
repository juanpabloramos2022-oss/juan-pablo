#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Motor Quirúrgico de Edición en Caliente (Hot-Swap) - Factoría TikTok V33.7
Regenera de forma quirúrgica una escena individual sin re-sintetizar las demás.
Actualiza texto, audio (Edge-TTS), subtítulos y script.json.
"""
import os
import sys
import json
import shutil
import asyncio
import subprocess
import argparse

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_TIKTOK = r"C:\tiktok"
GLOBAL_AUDIO_DIR = os.path.join(BASE_TIKTOK, "audio")
FFMPEG_EXE = os.path.join(BASE_TIKTOK, "ffmpeg.exe")
CURRENT_PROJECT_FILE = os.path.join(BASE_TIKTOK, "current_project.txt")

MIRROR_SCRIPT_PATHS = [
    os.path.join(BASE_TIKTOK, "script.json"),
    os.path.join(BASE_TIKTOK, "flow", "script.json")
]

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

async def synthesize_edge_tts(text: str, output_path: str, voice: str = "es-ES-AlvaroNeural", rate: str = "+0%"):
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate=rate)
    await comm.save(output_path)

def generate_voice_file(text: str, output_path: str, voice: str, rate: str = "+0%", niche: str = "Misterio") -> float:
    text = text.strip()
    if not text:
        return 0.0
    
    # Si la voz es de Gemini (Puck, Charon, Kore, Fenrir, Aoede)
    gemini_names = ["charon", "puck", "kore", "fenrir", "aoede"]
    if any(g in voice.lower() for g in gemini_names) or "gemini" in voice.lower():
        try:
            from generar_audio_gemini import generate_voice_smart
            clean_v = voice.replace("[Gemini]", "").replace("[gemini]", "").strip()
            dur, _ = generate_voice_smart(text, output_path, clean_v, niche)
            if dur > 0:
                return dur
        except Exception:
            pass

    # Motor Edge-TTS estandar
    asyncio.run(synthesize_edge_tts(text, output_path, voice=voice, rate=rate))
    return get_audio_duration(output_path)

def format_ass_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

def build_ass_subtitles(scene_timings: list, output_ass_path: str):
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
    dialogues = []
    for item in scene_timings:
        start_t = item["start_time"]
        dur = item["duration"]
        text = item["text"].strip()
        words = text.split()
        if not words or dur <= 0:
            continue
        
        chunks = []
        chunk_size = 2 if len(words) <= 5 else 3
        for i in range(0, len(words), chunk_size):
            chunks.append(" ".join(words[i:i+chunk_size]))
        
        chunk_duration = dur / len(chunks)
        for idx, chunk in enumerate(chunks):
            c_start = start_t + (idx * chunk_duration)
            c_end = c_start + chunk_duration
            style = "TikTokYellow" if idx % 2 == 0 else "TikTokWhite"
            clean_chunk = chunk.upper().replace('"', '').replace(',', '').replace('.', '')
            dialogues.append(f"Dialogue: 0,{format_ass_time(c_start)},{format_ass_time(c_end)},{style},,0,0,0,,{clean_chunk}")

    with open(output_ass_path, "w", encoding="utf-8") as f:
        f.write(header + "\n".join(dialogues) + "\n")

def main():
    parser = argparse.ArgumentParser(description="Motor Quirúrgico de Reemplazo en Caliente (Hot-Swap V33.7)")
    parser.add_argument("--escena", type=int, required=True, help="Número de escena a regenerar (ej: 2 o 3)")
    parser.add_argument("--texto", default=None, help="Nuevo texto de la locución para esta escena")
    parser.add_argument("--voz", default=None, help="Perfil de voz TTS opcional para esta escena")
    parser.add_argument("--proyecto", default=None, help="Ruta del proyecto (por defecto lee current_project.txt)")
    args = parser.parse_args()

    target_scene_num = args.escena
    proj_dir = resolve_project_dir(args.proyecto)
    script_path = os.path.join(proj_dir, "script.json")
    audio_dir = os.path.join(proj_dir, "audio")
    os.makedirs(audio_dir, exist_ok=True)

    if not os.path.exists(script_path):
        print(f"[Error] No se encontró script.json en: {proj_dir}", file=sys.stderr)
        sys.exit(1)

    try:
        with open(script_path, "r", encoding="utf-8-sig") as f:
            script_data = json.load(f)
    except Exception as e:
        print(f"[Error] Fallo leyendo script.json: {e}", file=sys.stderr)
        sys.exit(1)

    meta = script_data.get("project_meta", {})
    scenes = script_data.get("scenes") or script_data.get("escenas") or []

    # 1. Localizar la escena indicada
    target_scene = None
    target_index = -1
    for i, sc in enumerate(scenes):
        if int(sc.get("scene_number", i + 1)) == target_scene_num:
            target_scene = sc
            target_index = i
            break

    if target_scene is None:
        print(f"[Error] La escena {target_scene_num} no existe en {script_path}. Escenas disponibles: {[sc.get('scene_number', idx+1) for idx, sc in enumerate(scenes)]}", file=sys.stderr)
        sys.exit(1)

    # 2. Actualizar el texto si se proporcionó
    if args.texto:
        target_scene["narration"] = args.texto.strip()

    narration_text = target_scene.get("narration") or target_scene.get("text") or ""
    if not narration_text:
        print(f"[Error] La escena {target_scene_num} no tiene texto de narración.", file=sys.stderr)
        sys.exit(1)

    voice = args.voz or meta.get("voice_profile", "es-ES-AlvaroNeural")
    rate = meta.get("voice_rate", "+0%")

    niche = meta.get("niche", "Misterio")

    # 3. Sintetizar ÚNICAMENTE el audio de la escena indicada
    p_num = f"{target_scene_num:04d}"
    target_audio_file = os.path.join(audio_dir, f"voice_scene_{p_num}.mp3")
    
    # Sintetizar audio para esta escena exclusivamente (Gemini / Edge-TTS)
    new_dur = generate_voice_file(narration_text, target_audio_file, voice=voice, rate=rate, niche=niche)

    # Si es escena 1 y tiene hook_b, no sobreescribir hook_b a menos que se especifique
    if target_scene_num == 1 and target_scene.get("hook_b"):
        hook_b_file = os.path.join(audio_dir, "voice_scene_0001_b.mp3")
        if not os.path.exists(hook_b_file):
            generate_voice_file(target_scene["hook_b"], hook_b_file, voice=voice, rate=rate, niche=niche)

    # Recalcular duracion estimada (clamped al techo de 5.0s)
    target_scene["duracion_estimada_segundos"] = round(min(5.0, max(1.5, new_dur)), 1)
    target_scene["voice_profile"] = voice

    # 4. Generar subtitulos individuales para la escena
    indiv_sub_path = os.path.join(audio_dir, f"subtitles_scene_{p_num}.ass")
    indiv_timings = [{"scene_number": target_scene_num, "text": narration_text, "start_time": 0.0, "duration": new_dur}]
    build_ass_subtitles(indiv_timings, indiv_sub_path)

    # 5. Reconstruir el archivo maestro de subtitulos (subtitles.ass) con las duraciones existentes sin alterar los demas audios
    all_timings = []
    curr_time = 0.0
    for i, sc in enumerate(scenes):
        s_num = int(sc.get("scene_number", i + 1))
        p = f"{s_num:04d}"
        s_text = sc.get("narration") or sc.get("text") or ""
        s_audio = os.path.join(audio_dir, f"voice_scene_{p}.mp3")
        
        if s_num == target_scene_num:
            s_dur = new_dur
        else:
            s_dur = get_audio_duration(s_audio)
            if s_dur <= 0:
                s_dur = float(sc.get("duracion_estimada_segundos") or 3.0)

        all_timings.append({
            "scene_number": s_num,
            "text": s_text,
            "start_time": curr_time,
            "duration": s_dur
        })
        curr_time = round(curr_time + s_dur + 0.30, 2)

    master_sub_path = os.path.join(audio_dir, "subtitles.ass")
    hook_a_sub_path = os.path.join(audio_dir, "subtitles_hookA.ass")
    build_ass_subtitles(all_timings, master_sub_path)
    build_ass_subtitles(all_timings, hook_a_sub_path)

    # 6. Guardar cambios en script.json y copias espejo
    with open(script_path, "w", encoding="utf-8") as f:
        json.dump(script_data, f, indent=2, ensure_ascii=False)

    for mirror in MIRROR_SCRIPT_PATHS:
        try:
            os.makedirs(os.path.dirname(mirror), exist_ok=True)
            with open(mirror, "w", encoding="utf-8") as f:
                json.dump(script_data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    # Espejo de audio global si aplica
    try:
        os.makedirs(GLOBAL_AUDIO_DIR, exist_ok=True)
        global_target_audio = os.path.join(GLOBAL_AUDIO_DIR, f"voice_scene_{p_num}.mp3")
        shutil.copy2(target_audio_file, global_target_audio)
    except Exception:
        pass

    # 7. Imprimir reporte limpio requerido
    print(f"[OK] Escena {target_scene_num} actualizada. Audio: voice_scene_{p_num}.mp3 ({new_dur:.2f}s) | Resto de escenas intactas.")

if __name__ == "__main__":
    main()
