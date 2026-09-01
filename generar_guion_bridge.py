#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Puente Robusto Anti-Comillas para n8n Form Trigger (Factoria TikTok V33.7)
Recibe payload seguro con nuevos campos cinematograficos (pacing, visual, modo),
guarda current_input.json y ejecuta generar_guion_llm.py sin shell.
"""
import os
import sys
import json
import base64
import subprocess

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_TIKTOK = r"C:\tiktok"
CURRENT_INPUT_FILE = os.path.join(BASE_TIKTOK, "current_input.json")
LLM_SCRIPT = os.path.join(BASE_TIKTOK, "generar_guion_llm.py")

def parse_input():
    payload = {}
    args = sys.argv[1:]
    
    # 1. Parsear --b64 si fue suministrado
    for i, arg in enumerate(args):
        if arg == "--b64" and i + 1 < len(args):
            b64_str = args[i + 1].strip().strip("'").strip('"')
            if b64_str and not b64_str.startswith("--"):
                try:
                    raw = base64.b64decode(b64_str).decode("utf-8")
                    payload = json.loads(raw)
                    break
                except Exception:
                    pass
        elif arg.startswith("--b64="):
            b64_str = arg.split("=", 1)[1].strip().strip("'").strip('"')
            if b64_str:
                try:
                    raw = base64.b64decode(b64_str).decode("utf-8")
                    payload = json.loads(raw)
                    break
                except Exception:
                    pass

    # 2. Parsear --input-json o --file si existe
    if not payload:
        for i, arg in enumerate(args):
            if arg in ["--input-json", "--file"] and i + 1 < len(args):
                path = args[i + 1].strip().strip("'").strip('"')
                if os.path.exists(path):
                    try:
                        with open(path, "r", encoding="utf-8") as f:
                            payload = json.load(f)
                            break
                    except Exception:
                        pass

    # 3. Parsear banderas CLI directas
    if not payload:
        for i, arg in enumerate(args):
            if arg in ["--idea", "--tema", "--contenido"] and i + 1 < len(args):
                payload["contenido_input"] = args[i + 1].strip()
            elif arg in ["--modo-trabajo", "--modo"] and i + 1 < len(args):
                payload["modo_trabajo"] = args[i + 1].strip()
            elif arg in ["--estilo-ritmo", "--ritmo"] and i + 1 < len(args):
                payload["estilo_ritmo"] = args[i + 1].strip()
            elif arg in ["--estilo-visual", "--visual"] and i + 1 < len(args):
                payload["estilo_visual"] = args[i + 1].strip()
            elif arg == "--nicho" and i + 1 < len(args):
                payload["nicho"] = args[i + 1].strip()
            elif arg in ["--escenas", "--escenas-total"] and i + 1 < len(args):
                payload["escenas_total"] = args[i + 1].strip()
            elif arg == "--voz" and i + 1 < len(args):
                payload["voz"] = args[i + 1].strip()
            elif arg == "--musica" and i + 1 < len(args):
                payload["musica"] = args[i + 1].strip()

    # 4. Fallback a stdin si no es una terminal tty
    if not payload:
        try:
            if not sys.stdin.isatty():
                stdin_data = sys.stdin.read().strip()
                if stdin_data and stdin_data.startswith("{"):
                    payload = json.loads(stdin_data)
        except Exception:
            pass

    # 5. Fallback a current_input.json si existe
    if not payload and os.path.exists(CURRENT_INPUT_FILE):
        try:
            with open(CURRENT_INPUT_FILE, "r", encoding="utf-8") as f:
                payload = json.load(f)
        except Exception:
            pass

    # Normalizar valores con defaults solidos
    idea = str(payload.get("contenido_input") or payload.get("idea_tema") or payload.get("idea") or payload.get("tema") or "El secreto del manuscrito Voynich").strip()
    modo_trabajo = str(payload.get("modo_trabajo") or "Crear Guion desde Idea").strip()
    estilo_ritmo = str(payload.get("estilo_ritmo") or payload.get("ritmo") or "Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)").strip()
    estilo_visual = str(payload.get("estilo_visual") or payload.get("visual") or "Cinemático Oscuro Hiperrealista (Lente 35mm, sombras profundas)").strip()
    nicho = str(payload.get("nicho") or "Misterio").strip()
    
    escenas_val = payload.get("escenas_total") or payload.get("escenas") or 3
    if "7" in str(escenas_val):
        escenas = 7
    elif "5" in str(escenas_val):
        escenas = 5
    else:
        escenas = 3
    
    voz = str(payload.get("voz") or "es-ES-AlvaroNeural").strip()
    musica = str(payload.get("musica") or "ambient_cinematic.mp3").strip()

    final_payload = {
        "contenido_input": idea,
        "modo_trabajo": modo_trabajo,
        "estilo_ritmo": estilo_ritmo,
        "estilo_visual": estilo_visual,
        "nicho": nicho,
        "escenas_total": escenas,
        "voz": voz,
        "musica": musica
    }

    # Escribir siempre en current_input.json para auditoria completa
    try:
        with open(CURRENT_INPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(final_payload, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Aviso Bridge] Error guardando current_input.json: {e}", file=sys.stderr)

    return final_payload

def main():
    data = parse_input()
    idea = data["contenido_input"]
    modo_trabajo = data["modo_trabajo"]
    estilo_ritmo = data["estilo_ritmo"]
    estilo_visual = data["estilo_visual"]
    nicho = data["nicho"]
    escenas = str(data["escenas_total"])
    voz = data["voz"]
    musica = data["musica"]

    # Invocar generar_guion_llm.py sin shell
    cmd = [
        sys.executable,
        LLM_SCRIPT,
        "--idea", idea,
        "--modo-trabajo", modo_trabajo,
        "--ritmo", estilo_ritmo,
        "--visual", estilo_visual,
        "--nicho", nicho,
        "--escenas", escenas,
        "--voz", voz,
        "--musica", musica
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, errors="replace", check=True)
        stdout = proc.stdout
    except subprocess.CalledProcessError as err:
        stdout = err.stdout or ""
        stderr = err.stderr or ""
        print(f"[Error LLM]: {stderr}", file=sys.stderr)

    # Parsear respuesta del LLM
    parsed = {}
    try:
        json_start = stdout.rfind('{')
        json_end = stdout.rfind('}')
        if json_start != -1 and json_end != -1:
            parsed = json.loads(stdout[json_start:json_end + 1])
    except Exception:
        pass

    slug = idea.replace(" ", "_").replace('"', '').replace("'", "")[:60]
    project_dir = parsed.get("project_dir") or os.path.join(BASE_TIKTOK, "projects", slug)
    script_file = parsed.get("script_file") or os.path.join(project_dir, "script.json")
    project_name = parsed.get("project_name") or slug

    result = {
        "status": "ok",
        "mensaje": "Guion cinematografico generado con exito",
        "proyecto": project_name,
        "escenas": int(escenas),
        "duraciones_escenas": parsed.get("duraciones_escenas", []),
        "max_duracion": parsed.get("max_duracion", 5.0),
        "modo_trabajo": modo_trabajo,
        "ritmo": estilo_ritmo,
        "estilo_visual": estilo_visual,
        "nicho": nicho,
        "voz": voz,
        "carpeta_proyecto": project_dir,
        "script_file": script_file,
        "instrucciones": "1. Genera escenas en Flow/Vibes (limite 5.0s por toma). 2. Para ensamble: powershell -File C:\\tiktok\\ensamble.ps1"
    }

    # Imprimir unicamente JSON limpio a stdout
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
