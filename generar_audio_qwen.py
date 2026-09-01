#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Motor Universal de Locucion y Subtitulado Dinamico (Estilo TikTok / Hormozi).
- Soporta argumento --project-dir para aislamiento total por proyecto.
- Subtitulos ASS calibrados para 1080x1920 (Arial Black, Amarillo/Blanco, Outline 8).
"""
import os
import sys
import json
import time
import shutil
import asyncio
import subprocess

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_TIKTOK = r"C:\tiktok"
GLOBAL_AUDIO_DIR = os.path.join(BASE_TIKTOK, "audio")
FFMPEG_EXE = os.path.join(BASE_TIKTOK, "ffmpeg.exe")
CURRENT_PROJECT_FILE = os.path.join(BASE_TIKTOK, "current_project.txt")

def get_target_project_dir():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-dir", default=None)
    args, _ = parser.parse_known_args()

    if args.project_dir and os.path.isdir(args.project_dir):
        return args.project_dir
    if os.path.exists(CURRENT_PROJECT_FILE):
        try:
            with open(CURRENT_PROJECT_FILE, "r", encoding="utf-8") as f:
                p = f.read().strip()
                if os.path.isdir(p):
                    return p
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

def load_project_data(proj_dir: str):
    candidates = [
        os.path.join(proj_dir, "script.json"),
        os.path.join(BASE_TIKTOK, "script.json"),
        os.path.join(BASE_TIKTOK, "flow", "script.json")
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8-sig") as f:
                    data = json.load(f)
                meta = data.get("project_meta", {}) if isinstance(data, dict) else {}
                scenes = data.get("scenes") or data.get("escenas") or data.get("script") or [] if isinstance(data, dict) else data
                if isinstance(scenes, list) and len(scenes) > 0:
                    return meta, scenes
            except Exception:
                pass
    return {}, []

async def synthesize_edge_tts(text: str, output_path: str, voice: str = "es-ES-AlvaroNeural", rate: str = "+0%"):
    import edge_tts
    comm = edge_tts.Communicate(text, voice, rate=rate)
    await comm.save(output_path)

def generate_voice_file(text: str, output_path: str, voice: str, rate: str) -> float:
    text = text.strip()
    if not text:
        return 0.0
    try:
        asyncio.run(synthesize_edge_tts(text, output_path, voice=voice, rate=rate))
        dur = get_audio_duration(output_path)
        print(f"  [Voz] {os.path.basename(output_path)} -> {dur}s | {voice} | \"{text}\"")
        return dur
    except Exception as e:
        print(f"  [Error Voz]: {e}")
        return 0.0

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
    print(f"  [Subtitulos] Generado ASS (1080x1920): {output_ass_path}")

def mirror_to_global_audio(src_file: str):
    try:
        os.makedirs(GLOBAL_AUDIO_DIR, exist_ok=True)
        dst = os.path.join(GLOBAL_AUDIO_DIR, os.path.basename(src_file))
        shutil.copy2(src_file, dst)
    except Exception:
        pass

def main():
    proj_dir = get_target_project_dir()
    audio_dir = os.path.join(proj_dir, "audio") if proj_dir != BASE_TIKTOK else GLOBAL_AUDIO_DIR
    os.makedirs(audio_dir, exist_ok=True)

    meta, scenes = load_project_data(proj_dir)
    if not scenes:
        print("[Error] No se encontraron escenas.")
        sys.exit(1)

    project_name = meta.get("project_name", "proyecto")
    voice = meta.get("voice_profile", "es-ES-AlvaroNeural")
    rate = meta.get("voice_rate", "+0%")

    print("==================================================")
    print("GENERADOR VIRAL DE AUDIO Y SUBTITULOS (V33.7)")
    print(f"  Proyecto: {project_name} | Destino: {audio_dir}")
    print(f"  Voz: {voice} | Rate: {rate}")
    print("==================================================")

    # 1. Escena 1 (Hook A y Hook B)
    scene_1 = scenes[0]
    hook_a_text = scene_1.get("narration") or scene_1.get("text") or "Inicio de la historia"
    hook_b_text = scene_1.get("hook_b") or scene_1.get("narration_b") or "El misterio que nadie te cuenta..."

    out_hook_a = os.path.join(audio_dir, "voice_scene_0001.mp3")
    out_hook_b = os.path.join(audio_dir, "voice_scene_0001_b.mp3")

    dur_hook_a = generate_voice_file(hook_a_text, out_hook_a, voice, rate)
    dur_hook_b = generate_voice_file(hook_b_text, out_hook_b, voice, rate)
    mirror_to_global_audio(out_hook_a)
    mirror_to_global_audio(out_hook_b)

    # 2. Escenas 2..N
    later_scenes_data = []
    for i in range(1, len(scenes)):
        sc = scenes[i]
        s_num = sc.get("scene_number", i + 1)
        p = f"{int(s_num):04d}"
        narr = sc.get("narration") or sc.get("text") or ""
        out_f = os.path.join(audio_dir, f"voice_scene_{p}.mp3")
        dur = generate_voice_file(narr, out_f, voice, rate)
        mirror_to_global_audio(out_f)
        later_scenes_data.append({"scene_number": s_num, "text": narr, "duration": dur})

    # 3. Subtitulos Hook A
    timings_a = [{"scene_number": 1, "text": hook_a_text, "start_time": 0.0, "duration": dur_hook_a}]
    curr_t_a = round(dur_hook_a + 0.30, 2)
    for sc in later_scenes_data:
        timings_a.append({"scene_number": sc["scene_number"], "text": sc["text"], "start_time": curr_t_a, "duration": sc["duration"]})
        curr_t_a = round(curr_t_a + sc["duration"] + 0.30, 2)

    sub_a_path = os.path.join(audio_dir, "subtitles_hookA.ass")
    sub_def_path = os.path.join(audio_dir, "subtitles.ass")
    build_ass_subtitles(timings_a, sub_a_path)
    build_ass_subtitles(timings_a, sub_def_path)
    mirror_to_global_audio(sub_a_path)
    mirror_to_global_audio(sub_def_path)

    # 4. Subtitulos Hook B
    timings_b = [{"scene_number": 1, "text": hook_b_text, "start_time": 0.0, "duration": dur_hook_b}]
    curr_t_b = round(dur_hook_b + 0.30, 2)
    for sc in later_scenes_data:
        timings_b.append({"scene_number": sc["scene_number"], "text": sc["text"], "start_time": curr_t_b, "duration": sc["duration"]})
        curr_t_b = round(curr_t_b + sc["duration"] + 0.30, 2)

    sub_b_path = os.path.join(audio_dir, "subtitles_hookB.ass")
    build_ass_subtitles(timings_b, sub_b_path)
    mirror_to_global_audio(sub_b_path)

    print("\n[OK] Audios y subtitulos aislados completados exitosamente.")

if __name__ == "__main__":
    main()
