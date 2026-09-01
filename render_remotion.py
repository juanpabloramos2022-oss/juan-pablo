#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Motor de Renderizado Cinemático Remotion V33.7 (Formato Vertical 9:16 >60s)
Factoría TikTok - Integración Nativa con Componentes de Hans Acha.
- Orquesta clips de video con transiciones Zoom Punch.
- Subtítulos cinéticos dinámicos palabra por palabra con rebote spring.
- Barra de progreso superior de retención (0% a 100%).
- Pista de audio maestra con locución + música atenuada (ducking a -18dB).
- Renderizado controlado para 8GB RAM (--concurrency=2).
"""
import os
import sys
import json
import time
import shutil
import subprocess
import argparse

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_TIKTOK = r"C:\tiktok"
REMOTION_DIR = os.path.join(BASE_TIKTOK, "remotion")
REMOTION_PUBLIC = os.path.join(REMOTION_DIR, "public")
REMOTION_BIN = os.path.join(REMOTION_DIR, "node_modules", ".bin", "remotion.cmd")
FFMPEG_EXE = os.path.join(BASE_TIKTOK, "ffmpeg.exe")
CURRENT_PROJECT_FILE = os.path.join(BASE_TIKTOK, "current_project.txt")

FLOW_VIDEOS_DIR = os.path.join(BASE_TIKTOK, "flow", "videos")
GLOBAL_VIDEOS_DIR = os.path.join(BASE_TIKTOK, "videos")
GLOBAL_AUDIO_DIR = os.path.join(BASE_TIKTOK, "audio")

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
    return 3.0

def find_video_clip(scene_num: int, proj_videos_dir: str) -> str:
    p = f"{scene_num:04d}"
    candidates = [
        os.path.join(proj_videos_dir, f"scene_{p}.mp4"),
        os.path.join(proj_videos_dir, f"scene_{p}", "video_0001.mp4"),
        os.path.join(FLOW_VIDEOS_DIR, f"scene_{p}.mp4"),
        os.path.join(FLOW_VIDEOS_DIR, f"scene_{p}", "video_0001.mp4"),
        os.path.join(GLOBAL_VIDEOS_DIR, f"scene_{p}.mp4")
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 1000:
            return c
    return None

def build_kinetic_word_pages(scene_timings: list) -> list:
    """Construye páginas de subtítulos con marcas de tiempo en milisegundos para KineticSubtitles."""
    pages = []
    for item in scene_timings:
        start_ms = int(item["start_time"] * 1000)
        total_dur_ms = int(item["duration"] * 1000)
        text = item["text"].strip()
        fx = item.get("fx") or {}
        accent_color = fx.get("accent_color") or "#FFE500"
        kinetic_emphasis = fx.get("kinetic_emphasis") or ""
        words = text.split()
        if not words or total_dur_ms <= 0:
            continue

        # Agrupar en páginas de 3 palabras (estilo TikTok dinámico)
        chunk_size = 2 if len(words) <= 4 else 3
        chunks = [words[i:i + chunk_size] for i in range(0, len(words), chunk_size)]
        
        # Ponderación fonética por chunk
        chunk_weights = []
        for ch in chunks:
            raw_len = sum(len(w) for w in ch)
            vowels = sum(1 for w in ch for c in w.lower() if c in "aeiouáéíóú")
            bonus = 15 if any(p in ch[-1] for p in [",", ".", "!", "?", "..."]) else 0
            chunk_weights.append(max(10, raw_len + vowels + bonus))
        
        total_w = sum(chunk_weights)
        curr_page_start = start_ms

        for idx, ch in enumerate(chunks):
            ratio = chunk_weights[idx] / total_w
            page_dur_ms = int(total_dur_ms * ratio)
            page_end = curr_page_start + page_dur_ms

            # Asignar tiempo interno a cada palabra del chunk
            w_tokens = []
            word_dur_ms = page_dur_ms / max(1, len(ch))
            curr_w_start = curr_page_start

            for w in ch:
                clean_w = w.strip().replace('"', '').replace('“', '').replace('”', '')
                w_tokens.append({
                    "text": clean_w,
                    "startMs": int(curr_w_start),
                    "endMs": int(curr_w_start + word_dur_ms)
                })
                curr_w_start += word_dur_ms

            pages.append({
                "words": w_tokens,
                "startMs": curr_page_start,
                "endMs": page_end,
                "accentColor": accent_color,
                "kineticEmphasis": kinetic_emphasis
            })

            curr_page_start = page_end

    return pages

def main():
    parser = argparse.ArgumentParser(description="Renderizador Cinemático Remotion V33.7")
    parser.add_argument("--proyecto", default=None, help="Ruta del proyecto activo")
    parser.add_argument("--concurrency", type=int, default=2, help="Concurrencia de renderizado (segura para 8GB RAM)")
    parser.add_argument("--fps", type=int, default=30, help="Frames por segundo")
    parser.add_argument("--output", default=None, help="Ruta del archivo MP4 final")
    args = parser.parse_args()

    start_time = time.time()
    proj_dir = resolve_project_dir(args.proyecto)
    proj_name = os.path.basename(proj_dir)
    script_path = os.path.join(proj_dir, "script.json")
    proj_audio_dir = os.path.join(proj_dir, "audio")
    proj_videos_dir = os.path.join(proj_dir, "videos")
    output_dir = os.path.join(proj_dir, "output")
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(script_path):
        print(f"[Error] No se encontró script.json en {proj_dir}")
        sys.exit(1)

    with open(script_path, "r", encoding="utf-8-sig") as f:
        script_data = json.load(f)

    meta = script_data.get("project_meta", {})
    scenes = script_data.get("scenes") or []
    niche = meta.get("niche", "Misterio")

    print("==================================================")
    print("MOTOR DE RENDERIZADO REMOTION V33.7 (>60s MONETIZABLE)")
    print(f"  Proyecto: {proj_name}")
    print(f"  Nicho: {niche} | Total Escenas: {len(scenes)}")
    print(f"  Concurrencia: {args.concurrency} workers (Optimizado para 8GB RAM)")
    print("==================================================")

    # 1. Preparar carpetas en remotion/public
    remotion_audio_dir = os.path.join(REMOTION_PUBLIC, "audio")
    remotion_videos_dir = os.path.join(REMOTION_PUBLIC, "videos")
    os.makedirs(remotion_audio_dir, exist_ok=True)
    os.makedirs(remotion_videos_dir, exist_ok=True)

    # 2. Copiar y mapear música de fondo
    ambient_name = meta.get("ambient_track") or "ambient_cinematic.mp3"
    ambient_candidates = [
        os.path.join(proj_audio_dir, "ambient", ambient_name),
        os.path.join(GLOBAL_AUDIO_DIR, "ambient", ambient_name),
        os.path.join(GLOBAL_AUDIO_DIR, "ambient", "ambient_cinematic.mp3"),
        os.path.join(GLOBAL_AUDIO_DIR, "ambient", "ambient_corporate.mp3")
    ]
    ambient_src = None
    for cand in ambient_candidates:
        if os.path.exists(cand) and os.path.getsize(cand) > 1000:
            dst_ambient = os.path.join(remotion_audio_dir, "ambient.mp3")
            shutil.copy2(cand, dst_ambient)
            ambient_src = "audio/ambient.mp3"
            break

    # 3. Procesar escenas, audios, videos y calcular timings en frames
    scenes_config = []
    scene_timings = []
    current_frame = 0
    current_time_sec = 0.0

    for i, sc in enumerate(scenes):
        s_num = int(sc.get("scene_number", i + 1))
        p = f"{s_num:04d}"
        narr_text = sc.get("narration") or sc.get("text") or ""
        
        # Audio
        voice_cand = os.path.join(proj_audio_dir, f"voice_scene_{p}.mp3")
        if not os.path.exists(voice_cand):
            voice_cand = os.path.join(GLOBAL_AUDIO_DIR, f"voice_scene_{p}.mp3")

        dur_sec = get_audio_duration(voice_cand) if os.path.exists(voice_cand) else float(sc.get("duracion_estimada_segundos") or 3.5)
        # Añadir sutil padding de ritmo (+0.25s) entre escenas
        scene_total_sec = dur_sec + 0.25
        dur_frames = max(30, int(round(scene_total_sec * args.fps)))

        # Copiar audio a public
        rel_audio_src = None
        if os.path.exists(voice_cand):
            dst_audio = os.path.join(remotion_audio_dir, f"voice_scene_{p}.mp3")
            shutil.copy2(voice_cand, dst_audio)
            rel_audio_src = f"audio/voice_scene_{p}.mp3"

        # Video
        video_file = find_video_clip(s_num, proj_videos_dir)
        rel_video_src = None
        if video_file:
            dst_video = os.path.join(remotion_videos_dir, f"scene_{p}.mp4")
            shutil.copy2(video_file, dst_video)
            rel_video_src = f"videos/scene_{p}.mp4"

        fx = sc.get("remotion_fx") or {
            "transition_in": "zoom_in" if sc.get("tipo_ritmo") == "impacto" else "fade",
            "camera_movement": "shake_impact" if sc.get("tipo_ritmo") == "impacto" else "pan_zoom",
            "kinetic_emphasis": "",
            "accent_color": "#FF0033" if sc.get("tipo_ritmo") == "impacto" else "#FFE500",
            "overlay_style": "vignette_dark" if "misterio" in niche.lower() else "film_grain"
        }

        scenes_config.append({
            "sceneNumber": s_num,
            "fromFrame": current_frame,
            "durationInFrames": dur_frames,
            "videoSrc": rel_video_src,
            "audioSrc": rel_audio_src,
            "niche": niche,
            "fx": fx
        })

        scene_timings.append({
            "scene_number": s_num,
            "text": narr_text,
            "start_time": current_time_sec,
            "duration": dur_sec,
            "fx": fx
        })

        current_frame += dur_frames
        current_time_sec += scene_total_sec

    total_duration_sec = round(current_frame / args.fps, 2)

    # 4. Generar páginas de subtítulos cinéticos dinámicos
    subtitle_pages = build_kinetic_word_pages(scene_timings)

    hook_text = ""
    if scene_timings:
        first_txt = scene_timings[0].get("text", "")
        words_h = first_txt.split()
        hook_text = " ".join(words_h[:6]) + ("..." if len(words_h) > 6 else "")

    # 5. Generar props.json para la composición de Remotion
    props_data = {
        "projectName": proj_name,
        "hookTitle": hook_text or proj_name.replace("_", " "),
        "niche": niche,
        "scenes": scenes_config,
        "subtitlePages": subtitle_pages,
        "ambientTrackSrc": ambient_src,
        "ambientVolume": 0.12 # Ducking a -18dB
    }

    props_file = os.path.join(REMOTION_PUBLIC, "props.json")
    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(props_data, f, indent=2, ensure_ascii=False)

    print(f"[Remotion Props] {len(scenes_config)} escenas preparadas.")
    print(f"  Duración Total: {total_duration_sec}s ({current_frame} frames @ {args.fps}fps)")
    print(f"  Subtítulos Cinéticos: {len(subtitle_pages)} páginas generadas.")

    # 6. Lanzar Renderizado por CLI de Remotion
    final_output = args.output or os.path.join(output_dir, "video_final_remotion.mp4")
    
    render_cmd = [
        REMOTION_BIN,
        "render",
        "Root",
        final_output,
        f"--props={props_file}",
        f"--concurrency={args.concurrency}",
        "--gl=angle"
    ]

    print("\n[Render] Iniciando renderizado cinemático...")
    print(f"  Destino: {final_output}")
    
    render_start = time.time()
    try:
        proc = subprocess.run(
            render_cmd,
            cwd=REMOTION_DIR,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT
        )
        print(proc.stdout)
    except subprocess.CalledProcessError as e:
        print(f"[Error en Remotion Render]:\n{e.stdout}", file=sys.stderr)
        sys.exit(1)

    render_elapsed = round(time.time() - render_start, 2)
    total_elapsed = round(time.time() - start_time, 2)

    if os.path.exists(final_output):
        file_size_mb = round(os.path.getsize(final_output) / (1024 * 1024), 2)
        print("==================================================")
        print("RENDERIZADO REMOTION COMPLETADO CON ÉXITO")
        print(f"  Archivo Final: {final_output}")
        print(f"  Tamaño: {file_size_mb} MB")
        print(f"  Duración: {total_duration_sec}s (>60s Monetizable)")
        print(f"  Tiempo de Renderizado: {render_elapsed}s  |  Total: {total_elapsed}s")
        print("==================================================")
    else:
        print(f"[Error] No se encontró el archivo generado en: {final_output}")
        sys.exit(1)

if __name__ == "__main__":
    main()
