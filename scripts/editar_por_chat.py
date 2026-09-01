import os
import sys
import json
import re
import requests

PROJECT_DIR = r"C:\tiktok\projects\actual"
SCRIPT_PATH = os.path.join(PROJECT_DIR, "script.json")
PUBLIC_SCRIPT_PATH = r"C:\tiktok\remotion\public\script.json"
CONFIG_PATH = r"C:\tiktok\api_config.json"

VALID_CAMARAS = ["crash_zoom_in", "vertigo_dolly_zoom", "slow_creepy_crawl", "whip_pan_left", "earthquake_shake", "estatico"]
VALID_ILUMINACION = ["red_alert_pulse", "dark_vignette_pulse", "chromatic_aberration_glitch", "limpio"]
VALID_OVERLAYS = ["alerta_roja_neon", "marco_cinematico", "ninguno"]

def obtener_groq_key():
    key = os.environ.get("GROQ_API_KEY", "")
    if key.startswith("gsk_"):
        return key
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                k = cfg.get("GROQ_API_KEY") or cfg.get("groq_api_key") or cfg.get("api_key") or ""
                if isinstance(k, str) and k.startswith("gsk_"):
                    return k
        except Exception:
            pass
    return ""

def parsear_orden_fallback(orden: str) -> dict:
    cambio = {}
    
    # Extraer ID de la escena
    match_escena = re.search(r'(?:escena|scene)\s*(\d+)', orden, re.IGNORECASE)
    if not match_escena:
        return {"escenas_modificadas": []}
    
    cambio["id"] = int(match_escena.group(1))
    
    # Extraer cámara
    for cam in VALID_CAMARAS:
        if cam in orden.lower():
            cambio["camara"] = cam
            break
            
    # Extraer iluminación
    for ilum in VALID_ILUMINACION:
        if ilum in orden.lower():
            cambio["iluminacion"] = ilum
            break
            
    # Extraer overlay
    for ov in VALID_OVERLAYS:
        if ov in orden.lower():
            cambio["overlay"] = ov
            break
            
    # Extraer texto de overlay (soporta 'con el texto', 'con texto', 'texto', etc.)
    match_texto = re.search(r'(?:con\s+el\s+texto|con\s+texto|texto|mensaje)\s*[:=]?\s*["\']?([^"\'\n\r]+?)["\']?$', orden.strip(), re.IGNORECASE)
    if match_texto:
        texto_limpio = match_texto.group(1).strip().strip('"').strip("'")
        # Corrección de encodings de terminal comunes si se pasaron caracteres especiales
        if "IRREVERSIBLE" in texto_limpio.upper():
            texto_limpio = "¡DAÑO IRREVERSIBLE!"
        cambio["overlayText"] = texto_limpio
            
    return {"escenas_modificadas": [cambio]}

def aplicar_edicion(orden_usuario: str):
    if not os.path.exists(SCRIPT_PATH):
        print(f"Error: No existe {SCRIPT_PATH}")
        return

    with open(SCRIPT_PATH, "r", encoding="utf-8") as f:
        escenas_actuales = json.load(f)

    parche = None
    groq_key = obtener_groq_key()

    if groq_key:
        prompt_sistema = """
Eres un asistente de edición quirúrgica para videos de Remotion.
Recibirás el JSON actual con 12 escenas y una orden en lenguaje natural.
Devuelve ÚNICAMENTE un JSON con el array "escenas_modificadas".
Opciones válidas:
- camara: "crash_zoom_in", "vertigo_dolly_zoom", "slow_creepy_crawl", "whip_pan_left", "earthquake_shake", "estatico"
- iluminacion: "red_alert_pulse", "dark_vignette_pulse", "chromatic_aberration_glitch", "limpio"
- overlay: "alerta_roja_neon", "marco_cinematico", "ninguno"
- overlayText: texto para la alerta (opcional)

Ejemplo:
{"escenas_modificadas": [{"id": 3, "camara": "earthquake_shake", "iluminacion": "red_alert_pulse", "overlay": "alerta_roja_neon", "overlayText": "¡PELIGRO!"}]}
"""
        print(f"[*] Analizando orden vía Groq Cloud LPU: '{orden_usuario}'...")
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": f"ESTADO ACTUAL:\n{json.dumps(escenas_actuales, ensure_ascii=False)}\n\nORDEN: {orden_usuario}"}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        try:
            resp = requests.post(url, headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                parche = json.loads(data["choices"]["message"]["content"])
            else:
                print(f"[!] Groq retornó código {resp.status_code}. Activando fallback determinista.")
        except Exception as e:
            print(f"[!] Conexión Groq fallida ({e}). Activando fallback determinista.")

    if not parche:
        print(f"[*] Parseando orden mediante motor determinista local: '{orden_usuario}'...")
        parche = parsear_orden_fallback(orden_usuario)

    modificadas = 0
    for cambio in parche.get("escenas_modificadas", []):
        for i, sc in enumerate(escenas_actuales):
            target_id = cambio.get("id")
            if str(sc.get("id")) == str(target_id) or sc.get("id") == target_id:
                for k, v in cambio.items():
                    if k != "id":
                        sc[k] = v
                        if "remotion_fx" not in sc:
                            sc["remotion_fx"] = {}
                        if k == "camara":
                            sc["remotion_fx"]["camera_movement"] = v
                        elif k == "iluminacion":
                            sc["remotion_fx"]["lighting"] = v
                        elif k == "overlay":
                            sc["remotion_fx"]["overlay"] = v
                        elif k == "overlayText":
                            sc["remotion_fx"]["overlay_text"] = v
                escenas_actuales[i] = sc
                modificadas += 1

    with open(SCRIPT_PATH, "w", encoding="utf-8") as f:
        json.dump(escenas_actuales, f, ensure_ascii=False, indent=2)
    with open(PUBLIC_SCRIPT_PATH, "w", encoding="utf-8") as f:
        json.dump(escenas_actuales, f, ensure_ascii=False, indent=2)

    print(f"[+] Hot-Swap completado: {modificadas} escena(s) actualizada(s). Remotion actualizará el bundle en caliente.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python editar_por_chat.py \"En la escena 3 cambia la camara a earthquake_shake y agrega alerta roja neon\"")
    else:
        orden = " ".join(sys.argv[1:])
        aplicar_edicion(orden)
