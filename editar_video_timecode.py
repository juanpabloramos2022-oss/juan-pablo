#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Motor Agéntico de Edición por Timecode y Lenguaje Natural (V33.7)
Factoría TikTok - Permite mapear segundos o timecodes (ej: 0:14) a la escena exacta
y aplicar modificaciones quirúrgicas visuales (remotion_fx) o auditivas en tiempo real.
"""
import os
import sys
import json
import re
import shutil
import subprocess
import argparse

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_TIKTOK = r"C:\tiktok"
REMOTION_PUBLIC = os.path.join(BASE_TIKTOK, "remotion", "public")
CURRENT_PROJECT_FILE = os.path.join(BASE_TIKTOK, "current_project.txt")
REGEN_SCRIPT = os.path.join(BASE_TIKTOK, "regenerar_escena.py")
RENDER_SCRIPT = os.path.join(BASE_TIKTOK, "render_remotion.py")
FFMPEG_EXE = os.path.join(BASE_TIKTOK, "ffmpeg.exe")

def parse_timecode_to_seconds(tc: str, fps: int = 30) -> float:
    """Convierte '0:14', '14.5', '420f' o '00:00:14' a segundos."""
    tc = str(tc).strip()
    if tc.lower().endswith("f"):
        frames = int(tc[:-1])
        return round(frames / fps, 2)
    if ":" in tc:
        parts = tc.split(":")
        if len(parts) == 2:
            return round(float(parts[0]) * 60 + float(parts[1]), 2)
        elif len(parts) == 3:
            return round(float(parts[0]) * 3600 + float(parts[1]) * 60 + float(parts[2]), 2)
    return round(float(tc), 2)

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

def main():
    parser = argparse.ArgumentParser(description="Edición Agéntica por Timecode (V33.7)")
    parser.add_argument("--timecode", "--segundo", dest="timecode", default=None, help="Segundo o timecode (ej: '0:14', '14.5', '420f')")
    parser.add_argument("--escena", type=int, default=None, help="Número directo de escena (opcional si se da timecode)")
    parser.add_argument("--proyecto", default=None, help="Ruta del proyecto activo")
    
    # Modificaciones Visuales (remotion_fx)
    parser.add_argument("--transition", choices=["whip_right", "zoom_in", "glitch", "fade"], default=None, help="Transición de entrada")
    parser.add_argument("--camera", choices=["pan_zoom", "subtle_drift", "shake_impact"], default=None, help="Movimiento de cámara")
    parser.add_argument("--emphasis", default=None, help="Palabra clave a resaltar con resorte elástico")
    parser.add_argument("--color", default=None, help="Color HEX de acento (ej: #FF0033)")
    parser.add_argument("--overlay", choices=["film_grain", "vignette_dark", "hud_tech", "none"], default=None, help="Estilo de overlay")
    
    # Modificaciones Narrativas / Auditivas
    parser.add_argument("--texto", default=None, help="Nuevo texto de la locución para esta escena")
    parser.add_argument("--voz", default=None, help="Nuevo perfil de voz TTS (Charon, Puck, Álvaro, etc.)")

    args = parser.parse_args()

    proj_dir = resolve_project_dir(args.proyecto)
    script_path = os.path.join(proj_dir, "script.json")
    proj_audio_dir = os.path.join(proj_dir, "audio")

    if not os.path.exists(script_path):
        print(f"[Error] No se encontró script.json en: {proj_dir}", file=sys.stderr)
        sys.exit(1)

    with open(script_path, "r", encoding="utf-8-sig") as f:
        script_data = json.load(f)

    scenes = script_data.get("scenes") or []
    if not scenes:
        print("[Error] script.json no contiene escenas.", file=sys.stderr)
        sys.exit(1)

    # 1. Calcular los intervalos de tiempo acumulados de cada escena
    scene_intervals = []
    current_time = 0.0
    for idx, sc in enumerate(scenes):
        s_num = int(sc.get("scene_number", idx + 1))
        p = f"{s_num:04d}"
        v_file = os.path.join(proj_audio_dir, f"voice_scene_{p}.mp3")
        dur = get_audio_duration(v_file) if os.path.exists(v_file) else float(sc.get("duracion_estimada_segundos") or 3.5)
        scene_total = dur + 0.25
        start_t = current_time
        end_t = round(current_time + scene_total, 2)
        scene_intervals.append({
            "scene_number": s_num,
            "scene_ref": sc,
            "start": start_t,
            "end": end_t,
            "duration": dur
        })
        current_time = end_t

    # 2. Identificar la escena objetivo
    target_item = None
    if args.escena:
        target_item = next((it for it in scene_intervals if it["scene_number"] == args.escena), None)
    elif args.timecode is not None:
        target_sec = parse_timecode_to_seconds(args.timecode)
        for it in scene_intervals:
            if it["start"] <= target_sec < it["end"]:
                target_item = it
                break
        if target_item is None and target_sec >= scene_intervals[-1]["end"]:
            target_item = scene_intervals[-1]

    if not target_item:
        print(f"[Error] No se pudo mapear timecode '{args.timecode}' a ninguna escena.", file=sys.stderr)
        sys.exit(1)

    target_scene = target_item["scene_ref"]
    s_num = target_item["scene_number"]

    print("==================================================")
    print("EDICIÓN AGÉNTICA POR TIMECODE (V33.7)")
    print(f"  Proyecto: {os.path.basename(proj_dir)}")
    if args.timecode is not None:
        print(f"  Timecode Solicitado: {args.timecode} ({parse_timecode_to_seconds(args.timecode)}s)")
    print(f"  Escena Localizada: Escena {s_num} [{target_item['start']}s -> {target_item['end']}s]")
    print(f"  Narración Actual: \"{target_scene.get('narration', '')[:60]}...\"")
    print("==================================================")

    modified_audio = False
    modified_visual = False

    # 3. Aplicar cambios de texto o voz (Quirúrgico con regenerar_escena.py)
    if args.texto or args.voz:
        print("\n[Quirúrgico] Regenerando audio de la escena...")
        cmd_regen = [sys.executable, REGEN_SCRIPT, "--escena", str(s_num), "--proyecto", proj_dir]
        if args.texto:
            cmd_regen.extend(["--texto", args.texto])
        if args.voz:
            cmd_regen.extend(["--voz", args.voz])
        subprocess.run(cmd_regen, check=True)
        modified_audio = True

        # Re-cargar script.json tras la regeneración
        with open(script_path, "r", encoding="utf-8-sig") as f:
            script_data = json.load(f)
            target_scene = next((sc for sc in script_data.get("scenes", []) if int(sc.get("scene_number", 0)) == s_num), target_scene)

    # 4. Aplicar cambios visuales en remotion_fx
    fx = target_scene.get("remotion_fx") or {}
    if not isinstance(fx, dict):
        fx = {}

    changes_applied = []
    if args.transition:
        fx["transition_in"] = args.transition
        changes_applied.append(f"Transición -> {args.transition}")
        modified_visual = True
    if args.camera:
        fx["camera_movement"] = args.camera
        changes_applied.append(f"Cámara -> {args.camera}")
        modified_visual = True
    if args.emphasis:
        fx["kinetic_emphasis"] = args.emphasis.upper()
        changes_applied.append(f"Énfasis Cinético -> {args.emphasis.upper()}")
        modified_visual = True
    if args.color:
        fx["accent_color"] = args.color
        changes_applied.append(f"Color Acento -> {args.color}")
        modified_visual = True
    if args.overlay:
        fx["overlay_style"] = args.overlay
        changes_applied.append(f"Overlay -> {args.overlay}")
        modified_visual = True

    if modified_visual:
        target_scene["remotion_fx"] = fx
        with open(script_path, "w", encoding="utf-8") as f:
            json.dump(script_data, f, indent=2, ensure_ascii=False)
        print(f"[Visual FX] {', '.join(changes_applied)}")

    # 5. Sincronización instantánea con Remotion Studio (public/props.json)
    # Ejecutamos una pasada rápida de preparación de props sin renderizar
    try:
        from render_remotion import build_kinetic_word_pages, find_video_clip
        # Re-calcular timings
        scenes_config = []
        scene_timings = []
        curr_f = 0
        curr_t = 0.0
        niche = script_data.get("project_meta", {}).get("niche", "Misterio")
        
        for sc in script_data.get("scenes", []):
            sn = int(sc.get("scene_number", 1))
            pn = f"{sn:04d}"
            nt = sc.get("narration") or ""
            vf = os.path.join(proj_audio_dir, f"voice_scene_{pn}.mp3")
            dur = get_audio_duration(vf) if os.path.exists(vf) else float(sc.get("duracion_estimada_segundos") or 3.5)
            s_tot = dur + 0.25
            df = max(30, int(round(s_tot * 30)))

            scenes_config.append({
                "sceneNumber": sn,
                "fromFrame": curr_f,
                "durationInFrames": df,
                "videoSrc": f"videos/scene_{pn}.mp4" if find_video_clip(sn, os.path.join(proj_dir, "videos")) else None,
                "audioSrc": f"audio/voice_scene_{pn}.mp3" if os.path.exists(vf) else None,
                "niche": niche,
                "fx": sc.get("remotion_fx") or {}
            })
            scene_timings.append({
                "scene_number": sn,
                "text": nt,
                "start_time": curr_t,
                "duration": dur,
                "fx": sc.get("remotion_fx") or {}
            })
            curr_f += df
            curr_t += s_tot

        sub_pages = build_kinetic_word_pages(scene_timings)
        first_txt = scene_timings[0]["text"] if scene_timings else ""
        hook_t = " ".join(first_txt.split()[:6]) + ("..." if len(first_txt.split()) > 6 else "")

        props_data = {
            "projectName": os.path.basename(proj_dir),
            "hookTitle": hook_t or os.path.basename(proj_dir).replace("_", " "),
            "niche": niche,
            "scenes": scenes_config,
            "subtitlePages": sub_pages,
            "ambientTrackSrc": "audio/ambient.mp3",
            "ambientVolume": 0.12
        }

        props_file = os.path.join(REMOTION_PUBLIC, "props.json")
        with open(props_file, "w", encoding="utf-8") as f:
            json.dump(props_data, f, indent=2, ensure_ascii=False)
        print("\n[HMR Live] props.json actualizado en Remotion Studio (http://localhost:3000).")
    except Exception as e:
        print(f"[Aviso Props Sync]: {e}")

    print("==================================================")
    print("CAMBIO COMPLETADO CON ÉXITO")
    print(f"  Estado Escena {s_num}: FX={target_scene.get('remotion_fx')}")
    print("==================================================")

if __name__ == "__main__":
    main()
