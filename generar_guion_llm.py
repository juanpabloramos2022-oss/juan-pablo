import os
import sys
import json
import time
import shutil
import urllib.request
import urllib.error
import subprocess

BASE_TIKTOK = r"C:\tiktok"
CONFIG_DIR = os.path.join(BASE_TIKTOK, "config")
PROJECTS_ROOT = os.path.join(BASE_TIKTOK, "projects")
CURRENT_PROJECT_FILE = os.path.join(BASE_TIKTOK, "current_project.txt")
GEN_AUDIO_SCRIPT = os.path.join(BASE_TIKTOK, "generar_audio_qwen.py")
API_CONFIG_FILE = os.path.join(BASE_TIKTOK, "api_config.json")

GLOBAL_SFX_DIR = os.path.join(BASE_TIKTOK, "audio", "sfx")
GLOBAL_AMBIENT_DIR = os.path.join(BASE_TIKTOK, "audio", "ambient")

MIRROR_SCRIPT_PATHS = [
    os.path.join(BASE_TIKTOK, "script.json"),
    os.path.join(BASE_TIKTOK, "flow", "script.json")
]

# Configuracion de Endpoints Oficiales en la Nube
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

def sanitize_title(text: str) -> str:
    invalid_chars = r'\/:*?"<>|'
    cleaned = "".join([c if c not in invalid_chars and ord(c) >= 32 else "_" for c in text.strip()])
    cleaned = cleaned.replace(" ", "_")
    parts = [p for p in cleaned.split("_") if p]
    return "_".join(parts)[:60] or "Nuevo_Proyecto"

def resolve_groq_api_key() -> str:
    # 1. Variable de entorno
    key = os.environ.get("GROQ_API_KEY")
    if key and key.strip() and not key.strip().startswith("TU_") and len(key.strip()) > 10:
        return key.strip()

    # 2. Archivo directo C:\tiktok\api_config.json y alternativas
    candidates = [
        API_CONFIG_FILE,
        os.path.join(CONFIG_DIR, "api_config.json"),
        os.path.join(CONFIG_DIR, "groq_api_key.txt"),
        os.path.join(CONFIG_DIR, ".env"),
        os.path.join(BASE_TIKTOK, ".env"),
        ".env"
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                if path.endswith(".json"):
                    with open(path, "r", encoding="utf-8") as f:
                        cfg = json.load(f)
                        k = cfg.get("groq_api_key") or cfg.get("api_key")
                        if k and isinstance(k, str) and not k.startswith("TU_") and len(k.strip()) > 10:
                            return k.strip()
                else:
                    with open(path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith("GROQ_API_KEY="):
                                k = line.split("=", 1)[1].strip().strip('"').strip("'")
                                if k and not k.startswith("TU_") and len(k) > 10:
                                    return k
                            elif len(line) > 20 and line.startswith("gsk_"):
                                return line
            except Exception:
                pass
    return None

def resolve_openrouter_api_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY")
    if key and key.strip() and not key.strip().startswith("TU_"):
        return key.strip()

    candidates = [
        API_CONFIG_FILE,
        os.path.join(CONFIG_DIR, "openrouter_api_key.txt"),
        os.path.join(CONFIG_DIR, "api_config.json"),
        ".env"
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                if path.endswith(".json"):
                    with open(path, "r", encoding="utf-8") as f:
                        cfg = json.load(f)
                        k = cfg.get("openrouter_api_key") or cfg.get("openrouter_key")
                        if k and isinstance(k, str) and not k.startswith("TU_"):
                            return k.strip()
                else:
                    with open(path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith("OPENROUTER_API_KEY="):
                                return line.split("=", 1)[1].strip().strip('"').strip("'")
            except Exception:
                pass
    return None

def get_style_descriptor(estilo_visual: str) -> str:
    low = estilo_visual.lower()
    if "archivo" in low or "vintage" in low or "hist" in low:
        return "Authentic vintage historical documentary footage, aged 16mm archival film texture, sepia and muted earthy tones, historical realism, grain and subtle flicker, hyper-detailed museum artifact lighting, vertical 9:16 aspect ratio."
    elif "monigote" in low or "plastilina" in low or "clay" in low:
        return "Stylized 3D handcrafted claymation aesthetic, tactile polymer clay textures, whimsical stop-motion character design, soft studio lighting, tilt-shift depth of field, vibrant detailed surfaces, vertical 9:16 aspect ratio."
    elif "cient" in low or "macro" in low:
        return "Extreme macro scientific photography, electron microscope optical precision, hyper-detailed subatomic textures, bioluminescent specimen illumination, pristine scientific clarity, vertical 9:16 aspect ratio."
    else:
        # Default: Cinematic Dark Hyperrealistic
        return "Cinematic dark hyperrealistic photography, shot on 35mm anamorphic lens, deep dramatic shadows, volumetric rim lighting, photorealistic 8k, moody atmospheric depth, film grain, vertical 9:16 aspect ratio."

def build_system_prompt(idea: str, niche: str, total_scenes: int, voice: str, music: str,
                        modo_trabajo: str = "Crear Guion desde Idea",
                        estilo_ritmo: str = "Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)",
                        estilo_visual: str = "Cinemático Oscuro Hiperrealista (Lente 35mm, sombras profundas)") -> str:
    slug = sanitize_title(idea)
    style_desc = get_style_descriptor(estilo_visual)
    
    return f"""Eres un Director Cinematográfico de Élite y Guionista Audiovisual experto en retención extrema para TikTok, Shorts y Reels.
Tu misión es diseñar un guion con PACING DINÁMICO VARIABLE y CRITERIO CINEMATOGRÁFICO profesional, respetando el límite físico de los motores generativos de video (Google Flow / Vibes AI).

REGLAS CINEMATOGRÁFICAS Y NARRATIVAS OBLIGATORIAS:
1. LISTA NEGRA ESTRICTA (PALABRAS Y FÓRMULAS PROHIBIDAS):
   - TOTALMENTE PROHIBIDO abrir o usar: "El enigma de...", "El misterio oculto...", "En las sombras de...", "Descubre el secreto...", "¿Alguna vez te has preguntado...", "Enigmático", "Misterioso".
   - CERO relleno poético. Cero frases vacías de documental genérico.
2. ESTRUCTURA OBLIGATORIA DE GANCHO (Escena 1):
   - DEBE INICIAR SIEMPRE con una afirmación paradójica en segunda persona ("tú", "te", "tu cuerpo"), una contradicción directa o una cifra de shock inmediata.
   - Ejemplos válidos de inicio: "Tu cerebro encoge 2 milímetros cada vez que...", "Si crees que el agua limpia no mata...", "Tus huesos no se rompen por impacto, se disuelven por...".
   - En la Escena 1 incluye SIEMPRE "hook_b" con otra formulación paradójica en segunda persona para prueba A/B.
3. CONTINUIDAD Y TONO:
   - Frases cortas, directas y contundentes. Ritmo conversacional, tenso y urgente. Cada frase debe aumentar la presión psicológica sobre el espectador.
4. TECHO FÍSICO INQUEBRANTABLE: NINGUNA escena debe superar los 5.0 segundos. Rango permitido: 1.5s a 5.0s por toma.
5. PACING DINÁMICO POR CONTEXTO ({estilo_ritmo}):
   - Escenas de IMPACTO/GANCHO (1.5s a 2.0s): 3 a 5 palabras de locución potente. Cámara cinética, whip pan, crash zoom violento o corte ultra rápido.
   - Escenas de DESARROLLO (2.5s a 3.5s): 7 a 9 palabras de narración fluida. Movimiento de cámara suave, orbital o tracking lateral.
   - Escenas de MISTERIO/CLÍMAX (4.0s a 5.0s): 10 a 13 palabras densas de revelación. Cámara creeping push-in lento, dolly-in suspendido o revelación gradual.
   En estilo Híbrido, ALTERNA conscientemente entre impacto, desarrollo y clímax (ej. Escena 1: 1.8s impacto, Escena 2: 3.2s desarrollo, Escena 3: 4.8s clímax).
6. MODO DE TRABAJO: "{modo_trabajo}".
   - Si es "Segmentar y Adaptar mi Guion", divide el texto provisto respetando su esencia y adaptándolo a los bloques de 1.5s a 5.0s.
   - Si es "Crear Guion desde Idea", redacta una narrativa tensa y visceral sin clichés.
7. ESTILO VISUAL: "{estilo_visual}".
8. DIRECTIVA SIMBIÓTICA DE MOTION GRAPHICS (remotion_fx):
   Cada escena DEBE incluir el objeto "remotion_fx" sincronizado con la emoción y estética visual del clip:
   - "transition_in": "whip_right" (choque/corte rápido) | "zoom_in" (gancho/impacto) | "glitch" (revelación oscura/shock cognitivo) | "fade" (desarrollo suave).
   - "camera_movement": "pan_zoom" (procedural continuo) | "subtle_drift" (flotación ambiental lenta) | "shake_impact" (sacudida inicial de cámara).
   - "kinetic_emphasis": "PALABRA" (UNA sola palabra clave de la narración en MAYÚSCULAS para énfasis elástico extremo).
   - "accent_color": "#FF0033" (o HEX acorde al tono: #FF0033 peligro/sangre/shock, #FFE500 curiosidad/viral, #00F2FE ciencia/tecnología, #9D4EDD misterio arcano).
   - "overlay_style": "film_grain" | "vignette_dark" | "hud_tech" | "none".

Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura:
{{
  "project_meta": {{
    "project_name": "{slug}",
    "niche": "{niche}",
    "modo_trabajo": "{modo_trabajo}",
    "estilo_ritmo": "{estilo_ritmo}",
    "estilo_visual": "{estilo_visual}",
    "voice_profile": "{voice}",
    "voice_rate": "+0%",
    "ambient_track": "{music}",
    "ambient_volume": 0.15,
    "aspect_ratio": "9:16"
  }},
  "scenes": [
    {{
      "scene_number": 1,
      "tipo_ritmo": "impacto",
      "duracion_estimada_segundos": 1.8,
      "narration": "Frase de 3 a 5 palabras de impacto",
      "hook_b": "Apertura alternativa de curiosidad extrema",
      "remotion_fx": {{
        "transition_in": "zoom_in",
        "camera_movement": "shake_impact",
        "kinetic_emphasis": "CEREBRO",
        "accent_color": "#FF0033",
        "overlay_style": "vignette_dark"
      }},
      "prompt_visual": "{style_desc} Extreme vertical 9:16 cinematography depicting [sujeto y entorno detallados]. Lighting: moody high contrast volumetric fog. Camera motion: rapid kinetic whip pan with aggressive motion blur over 1.8 seconds, hyper-detailed photorealistic 8k, masterpiece film production value, cinematic composition, authentic atmosphere.",
      "image_prompt": "Cinematic vertical 9:16 shot of [sujeto y entorno], dramatic lighting, 8k.",
      "video_prompt": "Rapid kinetic whip pan over 1.8 seconds, smooth motion, 9:16."
    }}
  ]
}}
Genera exactamente {total_scenes} escenas numeradas 1 a {total_scenes}. No incluyas explicaciones ni texto fuera del JSON."""

def call_groq_direct(idea: str, niche: str, total_scenes: int, voice: str, music: str,
                     modo_trabajo: str, estilo_ritmo: str, estilo_visual: str, api_key: str):
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "FactoriaTikTok/V33.7"
    }

    system_prompt = build_system_prompt(idea, niche, total_scenes, voice, music, modo_trabajo, estilo_ritmo, estilo_visual)
    payload = {
        "model": GROQ_MODEL,
        "response_format": {"type": "json_object"},
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Premisa/Guion: {idea}\nNicho: {niche}\nEscenas: {total_scenes}\nRitmo: {estilo_ritmo}\nEstilo Visual: {estilo_visual}"}
        ]
    }

    req = urllib.request.Request(GROQ_URL, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=12) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        content = res_data["choices"][0]["message"]["content"]
        return json.loads(content)

def call_openrouter_fallback(idea: str, niche: str, total_scenes: int, voice: str, music: str,
                             modo_trabajo: str, estilo_ritmo: str, estilo_visual: str, api_key: str = None):
    headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tiktok-automation.local",
        "X-Title": "Factoria V33.7"
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    system_prompt = build_system_prompt(idea, niche, total_scenes, voice, music, modo_trabajo, estilo_ritmo, estilo_visual)
    payload = {
        "model": OPENROUTER_MODEL,
        "response_format": {"type": "json_object"},
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Premisa: {idea}\nResponde unicamente con el objeto JSON requerido."}
        ]
    }

    req = urllib.request.Request(OPENROUTER_URL, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=15) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        content = res_data["choices"][0]["message"]["content"]
        cleaned_content = content.strip()
        if "```json" in cleaned_content:
            cleaned_content = cleaned_content.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned_content:
            cleaned_content = cleaned_content.split("```")[1].split("```")[0].strip()
        return json.loads(cleaned_content)

def generate_procedural_fallback(idea: str, niche: str, total_scenes: int, voice: str, music: str,
                                 modo_trabajo: str = "Crear Guion desde Idea",
                                 estilo_ritmo: str = "Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)",
                                 estilo_visual: str = "Cinemático Oscuro Hiperrealista (Lente 35mm, sombras profundas)"):
    slug = sanitize_title(idea)
    style_desc = get_style_descriptor(estilo_visual)
    scenes = []
    
    # Patrones de duracion cinematografica variable segun estilo_ritmo
    low_ritmo = estilo_ritmo.lower()
    if "fren" in low_ritmo or "viral" in low_ritmo:
        pattern = [
            ("impacto", 1.8, "fast kinetic whip pan with aggressive motion blur over 1.8 seconds"),
            ("impacto", 2.2, "rapid tracking push-in with dynamic camera shake over 2.2 seconds"),
            ("impacto", 1.9, "high-speed snap zoom in over 1.9 seconds"),
            ("impacto", 2.4, "swift sweeping orbital pan over 2.4 seconds"),
            ("impacto", 2.0, "sudden kinetic crash zoom over 2.0 seconds")
        ]
    elif "tens" in low_ritmo or "docu" in low_ritmo:
        pattern = [
            ("desarrollo", 3.8, "steady atmospheric dolly tracking shot over 3.8 seconds"),
            ("climax", 4.8, "slow creeping cinematic push-in over 4.8 seconds with eerie stillness"),
            ("desarrollo", 4.2, "deep suspenseful slow zoom revealing the environment over 4.2 seconds"),
            ("climax", 5.0, "hypnotic slow forward creeping push-in over 5.0 seconds maximum duration"),
            ("desarrollo", 4.5, "deliberate slow cinematic tilt and pan over 4.5 seconds")
        ]
    else:
        # Hibrido Cinematografico (Alternar 1.5s, 3.2s y 4.8s)
        pattern = [
            ("impacto", 1.8, "fast kinetic crash zoom and whip pan over 1.8 seconds to hook audience"),
            ("desarrollo", 3.2, "smooth fluid tracking dolly shot over 3.2 seconds establishing dramatic details"),
            ("climax", 4.8, "slow creeping cinematic push-in over 4.8 seconds building unbearable suspense"),
            ("impacto", 2.1, "abrupt sudden whip pan reveal over 2.1 seconds"),
            ("climax", 4.9, "lingering ominous slow push-in over 4.9 seconds reaching dramatic conclusion")
        ]

    narrations_sample = [
        f"Tu cerebro tarda 0.3 segundos en registrar cómo {idea} te engaña.",
        f"Un desplazamiento de 3 milímetros en este registro destruye la versión oficial.",
        f"Tus órganos no fallan por impacto; colapsan por la presión en 4 segundos.",
        f"Los registros clasificados confirman la anomalía que ningún forense se atrevió a firmar.",
        f"La evidencia no desapareció; la enterraron bajo diez metros de concreto blindado.",
        f"Si notas una leve vibración en tu mandíbula, acabas de cruzar el umbral.",
        f"A partir de este segundo, tu memoria empezará a reemplazar lo que acabas de ver."
    ]

    for i in range(total_scenes):
        num = i + 1
        ritmo_type, dur, cam_motion = pattern[i % len(pattern)]
        narr = narrations_sample[i % len(narrations_sample)]
        
        # Generar prompt visual enriquecido (+100 palabras)
        prompt_vis = (
            f"{style_desc} Vertical 9:16 aspect ratio cinematic framing depicting a breathtaking visualization of {idea}, scene {num}. "
            f"Atmosphere: deeply immersive atmospheric haze, volumetric fog, dramatic chiaroscuro high contrast lighting, rich realistic shadows, "
            f"meticulous photorealistic 8k detail across all physical textures and surfaces. "
            f"Camera movement: {cam_motion}. "
            f"Color grading tailored for {niche} narrative, cinematic depth of field, anamorphic optical perfection, award-winning cinematography, ultra-sharp focus on subject, authentic filmic mood."
        )

        # Configurar remotion_fx simbiótico
        trans = "zoom_in" if ritmo_type == "impacto" else ("whip_right" if num % 2 == 0 else "fade")
        cam = "shake_impact" if ritmo_type == "impacto" else ("pan_zoom" if ritmo_type == "climax" else "subtle_drift")
        emphasis = ""
        words = [w.strip(".,;:!?\"'") for w in narr.split() if len(w.strip(".,;:!?\"'")) >= 5]
        if words:
            emphasis = words[0].upper()
        
        color = "#FF0033" if ritmo_type == "impacto" else ("#00F2FE" if "ciencia" in niche.lower() else "#FFE500")
        overlay = "vignette_dark" if "misterio" in niche.lower() else "film_grain"

        sc = {
            "scene_number": num,
            "tipo_ritmo": ritmo_type,
            "duracion_estimada_segundos": dur,
            "narration": narr,
            "remotion_fx": {
                "transition_in": trans,
                "camera_movement": cam,
                "kinetic_emphasis": emphasis,
                "accent_color": color,
                "overlay_style": overlay
            },
            "prompt_visual": prompt_vis,
            "image_prompt": f"Cinematic vertical 9:16 shot of {idea}, scene {num}, {niche} aesthetic, 8k dramatic lighting.",
            "video_prompt": f"{cam_motion}, vertical 9:16, 4k 30fps."
        }
        if num == 1:
            sc["hook_b"] = f"Si crees que {idea} no altera tu percepción, mira tus manos ahora mismo."
        scenes.append(sc)

    return {
        "project_meta": {
            "project_name": slug,
            "niche": niche,
            "modo_trabajo": modo_trabajo,
            "estilo_ritmo": estilo_ritmo,
            "estilo_visual": estilo_visual,
            "voice_profile": voice,
            "voice_rate": "+0%",
            "ambient_track": music,
            "ambient_volume": 0.15,
            "aspect_ratio": "9:16"
        },
        "scenes": scenes
    }

def normalize_and_clamp_scenes(script_data: dict, estilo_ritmo: str, estilo_visual: str, niche: str = "Misterio"):
    style_desc = get_style_descriptor(estilo_visual)
    scenes = script_data.get("scenes") or []
    for idx, sc in enumerate(scenes):
        # Clamping estricto e inquebrantable: 1.5s <= duracion <= 5.0s
        raw_dur = sc.get("duracion_estimada_segundos") or sc.get("duration") or 3.0
        try:
            dur = float(raw_dur)
        except (ValueError, TypeError):
            dur = 3.0
        dur = round(min(5.0, max(1.5, dur)), 1)
        sc["duracion_estimada_segundos"] = dur

        # Erradicacion forzosa de cliches prohibidos
        import re
        narr = sc.get("narration", "")
        cliche_patterns = [
            r"^(?:el enigma de|el enigma oculto de|el enigma oculto detrás de)\s*",
            r"^(?:el misterio de|el misterio oculto de|el misterio oculto detrás de)\s*",
            r"^(?:en las sombras de|en la oscuridad de)\s*",
            r"^(?:descubre el secreto de|conoce el secreto de)\s*",
            r"^(?:¿?alguna vez te has preguntado[^?]*\?\s*)"
        ]
        for c_pat in cliche_patterns:
            if re.search(c_pat, narr, re.IGNORECASE):
                narr = re.sub(c_pat, "Tu cuerpo reacciona antes de que notes cómo ", narr, flags=re.IGNORECASE)
                sc["narration"] = narr
                break

        # Asignar tipo_ritmo coherente
        if not sc.get("tipo_ritmo"):
            if dur <= 2.2:
                sc["tipo_ritmo"] = "impacto"
            elif dur <= 3.7:
                sc["tipo_ritmo"] = "desarrollo"
            else:
                sc["tipo_ritmo"] = "climax"

        ritmo = sc["tipo_ritmo"]

        # Normalizar remotion_fx
        fx = sc.get("remotion_fx")
        if not isinstance(fx, dict):
            fx = {}
        
        words = [w.strip(".,;:!?\"'") for w in narr.split() if len(w.strip(".,;:!?\"'")) >= 4]
        default_emp = words[0].upper() if words else "SHOCK"

        trans_def = "zoom_in" if ritmo == "impacto" else ("whip_right" if idx % 2 == 1 else "fade")
        cam_def = "shake_impact" if ritmo == "impacto" else ("pan_zoom" if ritmo == "climax" else "subtle_drift")
        color_def = "#FF0033" if ritmo == "impacto" else ("#00F2FE" if "ciencia" in niche.lower() else "#FFE500")
        overlay_def = "vignette_dark" if "misterio" in niche.lower() else "film_grain"

        sc["remotion_fx"] = {
            "transition_in": fx.get("transition_in") or trans_def,
            "camera_movement": fx.get("camera_movement") or cam_def,
            "kinetic_emphasis": (fx.get("kinetic_emphasis") or default_emp).upper(),
            "accent_color": fx.get("accent_color") or color_def,
            "overlay_style": fx.get("overlay_style") or overlay_def
        }

        # Garantizar prompt_visual (+100 palabras con cam motion)
        pv = sc.get("prompt_visual") or sc.get("video_prompt") or sc.get("image_prompt") or ""
        word_count = len(pv.split())
        if word_count < 100:
            cam_txt = f"Camera motion: deliberate cinematic push-in over {dur} seconds." if sc["tipo_ritmo"] != "impacto" else f"Camera motion: rapid kinetic whip pan over {dur} seconds."
            pv = f"{pv} {style_desc} Vertical 9:16 cinematic composition, 8k photorealistic resolution, volumetric rim lighting, deep dramatic shadows, award-winning cinematography, ultra-sharp focus on subject, authentic filmic mood. {cam_txt}"
        sc["prompt_visual"] = pv.strip()

        if not sc.get("image_prompt"):
            sc["image_prompt"] = sc["prompt_visual"][:300]
        if not sc.get("video_prompt"):
            sc["video_prompt"] = f"Camera movement matching {sc['tipo_ritmo']} over {dur} seconds, 9:16 vertical."

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generador de Guiones Cinematograficos (Groq Cloud V33.7)")
    parser.add_argument("--tema", "--idea", "--contenido", dest="idea", default="El secreto del manuscrito Voynich", help="Titulo, premisa o guion del video")
    parser.add_argument("--modo-trabajo", default="Crear Guion desde Idea", help="Modo de trabajo")
    parser.add_argument("--estilo-ritmo", "--ritmo", dest="estilo_ritmo", default="Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)", help="Estilo de ritmo")
    parser.add_argument("--estilo-visual", "--visual", dest="estilo_visual", default="Cinemático Oscuro Hiperrealista (Lente 35mm, sombras profundas)", help="Estilo visual")
    parser.add_argument("--nicho", default="Misterio", help="Nicho tematico")
    parser.add_argument("--escenas", type=int, default=3, help="Numero de escenas")
    parser.add_argument("--voz", default="es-ES-AlvaroNeural", help="Perfil de voz TTS")
    parser.add_argument("--musica", default="ambient_cinematic.mp3", help="Pista musical de fondo")
    parser.add_argument("--api-key", default=None, help="Clave API de Groq Cloud")
    parser.add_argument("--sync-audio", action="store_true", default=False, help="Ejecutar generacion de voz de forma bloqueante")
    parser.add_argument("--no-audio", action="store_true", default=False, help="Omitir generacion de audio")
    args = parser.parse_args()

    start_time = time.time()
    api_key_groq = args.api_key or resolve_groq_api_key()
    api_key_openrouter = resolve_openrouter_api_key()

    script_data = None
    provider_used = "Procedural Fallback"

    # Normalizar ritmo si viene simplificado (ej: "hibrido", "frenetico", "tension")
    ritmo_arg = args.estilo_ritmo
    if ritmo_arg.lower() in ["hibrido", "híbrido"]:
        ritmo_arg = "Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)"
    elif ritmo_arg.lower() in ["frenetico", "frenético"]:
        ritmo_arg = "Frenético Viral (Tomas rápidas de 1.5s a 2.5s)"
    elif ritmo_arg.lower() in ["tension", "tensión", "documental"]:
        ritmo_arg = "Tensión / Documental (Tomas sostenidas de 3.5s a 5s)"

    # 1. Intentar conexion directa con Groq Cloud API
    if api_key_groq and not str(api_key_groq).startswith("TU_"):
        try:
            print(f"[LLM] Conectando directamente con Groq Cloud API ({GROQ_MODEL})...")
            script_data = call_groq_direct(args.idea, args.nicho, args.escenas, args.voz, args.musica,
                                           args.modo_trabajo, ritmo_arg, args.estilo_visual, api_key_groq)
            provider_used = f"Groq Cloud ({GROQ_MODEL})"
        except Exception as e:
            print(f"[Aviso Groq]: {e}. Conmutando a OpenRouter Cloud...")

    # 2. Conmutacion redundante a OpenRouter Cloud API
    if not script_data and api_key_openrouter:
        try:
            print(f"[LLM Fallback] Conectando con OpenRouter Cloud API ({OPENROUTER_MODEL})...")
            script_data = call_openrouter_fallback(args.idea, args.nicho, args.escenas, args.voz, args.musica,
                                                   args.modo_trabajo, ritmo_arg, args.estilo_visual, api_key_openrouter)
            provider_used = f"OpenRouter ({OPENROUTER_MODEL})"
        except Exception as e:
            print(f"[Aviso OpenRouter]: {e}. Conmutando a generador procedural...")

    # 3. Blindaje procedural ultrarrapido (<0.01s, $0 USD)
    if not script_data:
        script_data = generate_procedural_fallback(args.idea, args.nicho, args.escenas, args.voz, args.musica,
                                                   args.modo_trabajo, ritmo_arg, args.estilo_visual)
        provider_used = "Procedural Neural Fallback (Cinematografico $0 USD)"

    # Normalizar y forzar el techo inquebrantable de 5.0s y remotion_fx simbiotico
    normalize_and_clamp_scenes(script_data, ritmo_arg, args.estilo_visual, args.nicho)

    elapsed_llm = round(time.time() - start_time, 3)

    # 4. Creacion de carpeta de proyecto aislada
    project_folder_name = sanitize_title(args.idea)
    project_dir = os.path.join(PROJECTS_ROOT, project_folder_name)

    for sub in ["audio", "audio/ambient", "audio/sfx", "videos", "output", "staging"]:
        os.makedirs(os.path.join(project_dir, sub), exist_ok=True)

    # Copiar recursos locales al proyecto si existen
    if os.path.exists(GLOBAL_SFX_DIR):
        for f in os.listdir(GLOBAL_SFX_DIR):
            src_f = os.path.join(GLOBAL_SFX_DIR, f)
            if os.path.isfile(src_f):
                shutil.copy2(src_f, os.path.join(project_dir, "audio", "sfx", f))

    if os.path.exists(GLOBAL_AMBIENT_DIR):
        for f in os.listdir(GLOBAL_AMBIENT_DIR):
            src_f = os.path.join(GLOBAL_AMBIENT_DIR, f)
            if os.path.isfile(src_f):
                shutil.copy2(src_f, os.path.join(project_dir, "audio", "ambient", f))

    # Guardar script.json
    project_script_path = os.path.join(project_dir, "script.json")
    with open(project_script_path, "w", encoding="utf-8") as f:
        json.dump(script_data, f, indent=2, ensure_ascii=False)

    # Actualizar puntero de proyecto activo
    with open(CURRENT_PROJECT_FILE, "w", encoding="utf-8") as f:
        f.write(project_dir)

    # Espejos de compatibilidad
    for p in MIRROR_SCRIPT_PATHS:
        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, "w", encoding="utf-8") as f:
                json.dump(script_data, f, indent=2, ensure_ascii=False)
        except Exception:
            pass

    # 5. Generar locuciones y subtitulos en la carpeta del proyecto
    if not args.no_audio and os.path.exists(GEN_AUDIO_SCRIPT):
        if args.sync_audio:
            print(f"[Audio] Generando locuciones sincronizadas en: {project_dir}...")
            try:
                subprocess.run([sys.executable, GEN_AUDIO_SCRIPT, "--project-dir", project_dir], check=True)
            except Exception as e:
                print(f"[Aviso Audio]: {e}")
        else:
            creation_flags = 0x08000000 if sys.platform == "win32" else 0  # CREATE_NO_WINDOW
            try:
                subprocess.Popen(
                    [sys.executable, GEN_AUDIO_SCRIPT, "--project-dir", project_dir],
                    creationflags=creation_flags
                )
                print(f"[Audio] Despachada generacion de audio y subtitulos en segundo plano para: {project_dir}")
            except Exception as e:
                print(f"[Aviso Audio Background]: {e}")

    total_time = round(time.time() - start_time, 3)

    # Resumen de duraciones por escena
    durations = [sc["duracion_estimada_segundos"] for sc in script_data.get("scenes", [])]
    rhythms = [sc["tipo_ritmo"] for sc in script_data.get("scenes", [])]

    result = {
        "status": "success",
        "provider": provider_used,
        "llm_response_time_seconds": elapsed_llm,
        "total_setup_time_seconds": total_time,
        "project_dir": project_dir,
        "project_folder": project_folder_name,
        "script_file": project_script_path,
        "project_name": script_data.get("project_meta", {}).get("project_name", project_folder_name),
        "scenes_count": len(script_data.get("scenes", [])),
        "duraciones_escenas": durations,
        "ritmos_escenas": rhythms,
        "max_duracion": max(durations) if durations else 0,
        "min_duracion": min(durations) if durations else 0,
        "modo_trabajo": script_data.get("project_meta", {}).get("modo_trabajo"),
        "estilo_ritmo": script_data.get("project_meta", {}).get("estilo_ritmo"),
        "estilo_visual": script_data.get("project_meta", {}).get("estilo_visual")
    }

    print("\n==================================================")
    print("MIGRACION GROQ CLOUD DIRECTO (V33.7) - PACING DINÁMICO")
    print(f"  Proveedor: {provider_used}")
    print(f"  Tiempo LLM: {elapsed_llm}s  |  Tiempo Total: {total_time}s")
    print(f"  Duraciones Escenas: {durations} (Máx: {max(durations) if durations else 0}s)")
    print(f"  Carpeta Proyecto: {project_dir}")
    print("==================================================")
    print(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
