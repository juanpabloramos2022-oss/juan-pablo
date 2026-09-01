#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
generador_guion.py - Generador de Guiones Simbióticos V33.8
Co-Director de Arte Algorítmico Polimórfico (Groq Cloud Llama-3.3-70B)
Garantiza 12 escenas atómicas con directivas de cámara, transiciones sin repetición consecutiva,
colores emocionales y texturas cinematográficas.
"""

import os
import sys
import json
import random
import urllib.request
import urllib.error

try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = r"C:\tiktok"
OUTPUT_DIR = os.path.join(BASE_DIR, "projects", "actual")
SCRIPT_OUTPUT = os.path.join(OUTPUT_DIR, "script.json")
PUBLIC_SCRIPT = os.path.join(BASE_DIR, "remotion", "public", "script.json")
API_CONFIG_FILE = os.path.join(BASE_DIR, "api_config.json")

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

CAMERA_MOVEMENTS = ["crash_zoom_in", "pan_zoom_out", "pan_diagonal", "shake", "macro_drift"]
TRANSITIONS = ["fade", "blur_fade", "flash_white", "smash_cut"]
HIGHLIGHT_COLORS = {
    "alerta": "#FF0055",
    "intriga": "#FFE500",
    "datos": "#00F0FF",
    "exito": "#00FF66"
}
COLOR_LIST = ["#FF0055", "#FFE500", "#00F0FF", "#00FF66"]
OVERLAYS = ["vignette_heavy", "grain_cinematic", "clean"]

BIOLOGICAL_HOOKS = [
    "Tu cerebro está borrando este recuerdo ahora mismo sin que te des cuenta.",
    "Tus ojos están ciegos durante cuarenta minutos al día y tu cerebro te lo oculta.",
    "Tu corazón se detuvo una fracción de segundo antes de que escucharas esto.",
    "Tus células están decidiendo si autodestruirse en este milisegundo exacto.",
    "Tu cerebro tarda cero punto tres segundos en procesar lo que tus ojos ya vieron.",
    "Tu sangre tarda exactamente sesenta segundos en recorrer todo tu cuerpo y regresar."
]

def resolve_api_keys():
    groq_key = os.environ.get("GROQ_API_KEY", "").strip()
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "").strip()

    if os.path.exists(API_CONFIG_FILE):
        try:
            with open(API_CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                if not groq_key:
                    groq_key = (cfg.get("groq_api_key") or cfg.get("api_key") or "").strip()
                if not openrouter_key:
                    openrouter_key = (cfg.get("openrouter_api_key") or "").strip()
        except Exception:
            pass

    return groq_key, openrouter_key

def enforce_consecutive_rules(scenes):
    """Garantiza matemáticamente que dos escenas consecutivas NO repitan movimiento ni transición."""
    last_move = None
    last_trans = None

    for idx, sc in enumerate(scenes):
        fx = sc.get("remotion_fx") or {}
        
        # 1. Movimiento de cámara
        move = fx.get("camera_movement")
        if not move or move == last_move or move not in CAMERA_MOVEMENTS:
            avail_moves = [m for m in CAMERA_MOVEMENTS if m != last_move]
            move = avail_moves[idx % len(avail_moves)]
        last_move = move

        # 2. Transición de salida
        trans = fx.get("transition_out")
        if not trans or trans == last_trans or trans not in TRANSITIONS:
            avail_trans = [t for t in TRANSITIONS if t != last_trans]
            trans = avail_trans[idx % len(avail_trans)]
        last_trans = trans

        # 3. Color de resalte
        color = fx.get("text_highlight_color")
        if not color or not color.startswith("#"):
            color = COLOR_LIST[idx % len(COLOR_LIST)]

        # 4. Superposición visual
        overlay = fx.get("visual_overlay")
        if not overlay or overlay not in OVERLAYS:
            overlay = OVERLAYS[idx % len(OVERLAYS)]

        sc["id"] = idx + 1
        sc["scene_number"] = idx + 1
        sc["image_filename"] = f"escena_{idx + 1}.png"
        
        # Asegurar límite de 15 palabras por escena
        words = sc.get("text", "").split()
        if len(words) > 15:
            sc["text"] = " ".join(words[:15])
        sc["narration_es"] = sc["text"]

        sc["remotion_fx"] = {
            "camera_movement": move,
            "transition_out": trans,
            "text_highlight_color": color,
            "visual_overlay": overlay
        }

    return scenes

def call_llm(endpoint: str, api_key: str, model: str, system_prompt: str, user_prompt: str):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "FactoriaTikTok/V33.8"
    }

    payload = {
        "model": model,
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
    }

    req = urllib.request.Request(endpoint, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)

def generate_procedural_script(selected_hook: str):
    print("[CO-DIRECTOR] Generando guion procedural con 12 escenas atómicas y Co-Director de Arte...")
    narrations = [
        selected_hook,
        "Cada vez que parpadeas, tu mente desconecta tu visión para no marearte.",
        "Esto significa que pasas casi una hora al día sumergido en oscuridad.",
        "Tu cortex visual inventa fotogramas falsos para que no entres en pánico.",
        "Mientras duermes, tu cuerpo se paraliza para no actuar tus pesadillas.",
        "Si esa barrera química falla, te levantarías con el sistema motor encendido.",
        "Tu corazón late cien mil veces bombeando sangre a presión brutal constante.",
        "La fuerza es suficiente para proyectar un chorro a nueve metros de distancia.",
        "En tu estómago hay ácido tan corrosivo que puede disolver metal duro.",
        "Produces una capa de moco protector cada minuto para no digerirte a ti mismo.",
        "Ahora mismo millones de bacterias en tu intestino están alterando tus emociones.",
        "Tú crees que controlas tus decisiones, pero tu cuerpo ya decidió por ti."
    ]

    scenes = []
    for idx, text in enumerate(narrations):
        scenes.append({
            "id": idx + 1,
            "text": text,
            "remotion_fx": {}
        })

    return enforce_consecutive_rules(scenes)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(PUBLIC_SCRIPT), exist_ok=True)

    selected_hook = random.choice(BIOLOGICAL_HOOKS)
    print("==================================================")
    print("FACTORÍA V33.8 - GENERADOR DE GUION Y CO-DIRECTOR DE ARTE")
    print(f"  Gancho de Retención: \"{selected_hook}\"")

    groq_key, openrouter_key = resolve_api_keys()
    scenes = None

    system_prompt = """Eres el Co-Director de Arte Algorítmico y Guionista de TikTok para Factoría V33.8.
Tu misión es generar exactamente 12 escenas de ultra-retención sobre shock biológico humano.
Cada escena debe contener:
- "id": número entero del 1 al 12
- "text": narración hablada en español (MÁXIMO 15 PALABRAS por escena, lenguaje visceral, directo y sin rodeos)
- "remotion_fx": {
    "camera_movement": uno de ["crash_zoom_in", "pan_zoom_out", "pan_diagonal", "shake", "macro_drift"],
    "transition_out": uno de ["fade", "blur_fade", "flash_white", "smash_cut"],
    "text_highlight_color": HEX (#FF0055 para peligro/alerta, #FFE500 para intriga, #00F0FF para datos, #00FF66 para éxito),
    "visual_overlay": uno de ["vignette_heavy", "grain_cinematic", "clean"]
  }

REGLAS ABSOLUTAS:
1. Dos escenas consecutivas NO pueden tener el mismo "camera_movement".
2. Dos escenas consecutivas NO pueden tener la misma "transition_out".
3. La escena 1 debe usar el gancho provisto.
4. Responde ÚNICAMENTE un objeto JSON con la clave "scenes": [ ... ] que contenga las 12 escenas."""

    user_prompt = f"Genera el guion completo de 12 escenas. El gancho inicial obligatorio para la escena 1 es: \"{selected_hook}\""

    if groq_key:
        try:
            print("[CO-DIRECTOR] Solicitando guion a Groq Cloud (Llama-3.3-70B)...")
            res = call_llm(GROQ_ENDPOINT, groq_key, GROQ_MODEL, system_prompt, user_prompt)
            scenes = res.get("scenes")
            if scenes and len(scenes) >= 12:
                scenes = enforce_consecutive_rules(scenes[:12])
                print("[CO-DIRECTOR] Guion generado exitosamente con Groq LPU.")
        except Exception as e:
            print(f"[CO-DIRECTOR] Error con Groq API: {e}. Conmutando a OpenRouter / Fallback...")

    if not scenes and openrouter_key:
        try:
            print("[CO-DIRECTOR] Conmutando a OpenRouter (Llama 3.3 Free)...")
            res = call_llm(OPENROUTER_ENDPOINT, openrouter_key, OPENROUTER_MODEL, system_prompt, user_prompt)
            scenes = res.get("scenes")
            if scenes and len(scenes) >= 12:
                scenes = enforce_consecutive_rules(scenes[:12])
                print("[CO-DIRECTOR] Guion generado exitosamente con OpenRouter.")
        except Exception as e:
            print(f"[CO-DIRECTOR] Error con OpenRouter: {e}.")

    if not scenes:
        scenes = generate_procedural_script(selected_hook)

    script_data = {
        "theme": "shock_biologico_humano_v33_8",
        "duration_target": 65,
        "scenes": scenes
    }

    with open(SCRIPT_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(script_data, f, ensure_ascii=False, indent=2)

    with open(PUBLIC_SCRIPT, "w", encoding="utf-8") as f:
        json.dump(script_data, f, ensure_ascii=False, indent=2)

    print(f"\n[OK] script.json generado con 12 escenas atómicas en:")
    print(f"  - {SCRIPT_OUTPUT}")
    print(f"  - {PUBLIC_SCRIPT}")
    for s in scenes:
        fx = s["remotion_fx"]
        print(f"  Escena {s['id']}: [{fx['camera_movement']}] -> [{fx['transition_out']}] | {fx['text_highlight_color']} | {len(s['text'].split())} palabras")

if __name__ == "__main__":
    main()
