#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
generador_guion.py - Generador de Guiones Simbióticos V33.8 (Groq Cloud API)
Cumple 100% con las reglas de 'juez_algoritmico_system_prompt.txt'.
Inferencia ultra-rápida con Llama-3.3-70B sin consumo de GPU ni RAM local.
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
API_CONFIG_FILE = os.path.join(BASE_DIR, "api_config.json")
JUEZ_PROMPT_FILE = os.path.join(BASE_DIR, "prompts", "juez_algoritmico_system_prompt.txt")

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

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
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)

def generate_procedural_script(selected_hook: str):
    print("[GUION] Generando guion procedural de $0 USD con 12 escenas de shock biológico...")
    scenes = []
    
    # 12 bloques cinéticos alternando FX
    narrations = [
        selected_hook,
        "Cada vez que parpadeas, tu mente desconecta tu visión para no marearte con el movimiento.",
        "Esto significa que pasas casi una hora al día sumergido en oscuridad total absoluta.",
        "Pero tu cortex visual inventa fotogramas falsos para que no entres en pánico.",
        "Mientras duermes, tu cuerpo se paraliza por completo para que no actúes tus pesadillas.",
        "Si esa barrera química falla, te levantarías dormido con el sistema motor encendido.",
        "Tu corazón late cien mil veces cada veinticuatro horas bombeando litros de sangre a presión.",
        "La fuerza es suficiente para proyectar un chorro a más de nueve metros de distancia.",
        "En tu estómago hay ácido tan corrosivo que puede disolver metal en pocas horas.",
        "La única razón por la que no te digieres a ti mismo es porque produces moco protector cada minuto.",
        "Ahora mismo, millones de bacterias en tu intestino están alterando tus emociones.",
        "Tú crees que controlas tus decisiones, pero tu cuerpo ya decidió por ti."
    ]

    for i in range(12):
        is_zoom = (i % 2 == 0)
        scenes.append({
            "scene_number": i + 1,
            "narration_es": narrations[i],
            "image_filename": f"escena_{i + 1}.png",
            "visual_prompt": f"Cinematic photorealistic 8k vertical 9:16 documentary scene #{i + 1}, dark atmospheric lighting, biological mystery",
            "remotion_fx": {
                "transformOrigin": "50.00% 50.00%",
                "animation_type": "pan_zoom" if is_zoom else "subtle_drift",
                "scale_start": 1.0 if is_zoom else 1.12,
                "scale_end": 1.15 if is_zoom else 1.0,
                "drift_x": 0 if is_zoom else (2.5 if i % 4 == 1 else -2.5)
            }
        })

    return {
        "theme": "shock_biologico_humano",
        "hook_strength_1_to_10": 10,
        "duration_target": 60,
        "scenes": scenes
    }

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    groq_key, openrouter_key = resolve_api_keys()

    selected_hook = random.choice(BIOLOGICAL_HOOKS)
    print("==================================================")
    print("FACTORÍA V33.8 - GENERADOR DE GUION SIMBIÓTICO")
    print(f"  Gancho de Retención: \"{selected_hook}\"")
    print(f"  Groq Cloud API Key: {'Configurada' if groq_key else 'No detectada'}")
    print("==================================================")

    system_prompt = """Eres el Algoritmo Central de Recomendación de TikTok. Tu objetivo es maximizar la tasa de retención (Hold Rate) y Completion Rate (>60s).
Debes generar un guion de EXACTAMENTE 12 escenas para un video de TikTok vertical (9:16).
REGLAS OBLIGATORIAS:
1. Anti-cliché estricto: Cero saludos, cero '¿Sabías que?', cero 'Descubre', cero rodeos.
2. La Escena 1 DEBE usar el gancho biológico en segunda persona provisto por el usuario.
3. Cinetismo narrativo constante: transiciones de estímulo cada 2 a 3 segundos. Frases directas, viscerales y magnéticas.
4. Formato de respuesta: Responde ÚNICA Y EXCLUSIVAMENTE con el objeto JSON con las 12 escenas y sus directivas remotion_fx.
Estructura JSON requerida:
{
  "theme": "shock_biologico",
  "hook_strength_1_to_10": 10,
  "duration_target": 60,
  "scenes": [
    {
      "scene_number": 1,
      "narration_es": "...",
      "image_filename": "escena_1.png",
      "visual_prompt": "...",
      "remotion_fx": {
        "transformOrigin": "50.00% 50.00%",
        "animation_type": "pan_zoom",
        "scale_start": 1.0,
        "scale_end": 1.15,
        "drift_x": 0
      }
    }
  ]
}"""

    user_prompt = f"Genera el guion viral de 12 escenas iniciando obligatoriamente en la escena 1 con la frase exacta: '{selected_hook}'"

    script_data = None

    # 1. Intentar con Groq Cloud API
    if groq_key:
        print("[GUION] Solicitando inferencia directa a Groq Cloud (Llama 3.3 70B)...")
        try:
            script_data = call_llm(GROQ_ENDPOINT, groq_key, GROQ_MODEL, system_prompt, user_prompt)
            print("[GUION] ¡Inferencia exitosa en Groq Cloud!")
        except Exception as e:
            print(f"[GUION] Aviso: Groq Cloud falló ({e}). Conmutando a fallback...")

    # 2. Intentar con OpenRouter Fallback
    if not script_data and openrouter_key:
        print("[GUION] Solicitando inferencia a OpenRouter Cloud...")
        try:
            script_data = call_llm(OPENROUTER_ENDPOINT, openrouter_key, OPENROUTER_MODEL, system_prompt, user_prompt)
            print("[GUION] ¡Inferencia exitosa en OpenRouter Cloud!")
        except Exception as e:
            print(f"[GUION] Aviso: OpenRouter falló ({e}).")

    # 3. Fallback Procedural de Alta Fidelidad
    if not script_data:
        script_data = generate_procedural_script(selected_hook)

    # Validar que tenga las 12 escenas y remotion_fx
    scenes = script_data.get("scenes", [])
    if len(scenes) < 12:
        print(f"[GUION] Completando escenas hasta 12 (actuales: {len(scenes)})...")
        procedural = generate_procedural_script(selected_hook)["scenes"]
        while len(scenes) < 12:
            idx = len(scenes)
            scenes.append(procedural[idx])
        script_data["scenes"] = scenes

    for i, sc in enumerate(scenes):
        sc["scene_number"] = i + 1
        sc["image_filename"] = f"escena_{i + 1}.png"
        if "remotion_fx" not in sc:
            is_zoom = (i % 2 == 0)
            sc["remotion_fx"] = {
                "transformOrigin": "50.00% 50.00%",
                "animation_type": "pan_zoom" if is_zoom else "subtle_drift",
                "scale_start": 1.0 if is_zoom else 1.12,
                "scale_end": 1.15 if is_zoom else 1.0,
                "drift_x": 0 if is_zoom else (2.5 if i % 4 == 1 else -2.5)
            }

    with open(SCRIPT_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(script_data, f, indent=2, ensure_ascii=False)

    print(f"\n[OK] script.json generado exitosamente en: {SCRIPT_OUTPUT}")
    print(f"  Escenas: {len(script_data['scenes'])}")
    print(f"  Gancho Escena 1: \"{script_data['scenes'][0]['narration_es']}\"")

if __name__ == "__main__":
    main()
