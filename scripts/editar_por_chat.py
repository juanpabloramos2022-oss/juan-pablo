import os
import sys
import json
import requests

PROJECT_DIR = r"C:\tiktok\projects\actual"
SCRIPT_PATH = os.path.join(PROJECT_DIR, "script.json")
PUBLIC_SCRIPT_PATH = r"C:\tiktok\remotion\public\script.json"
CONFIG_PATH = r"C:\tiktok\api_config.json"

def obtener_groq_key():
    key = os.environ.get("GROQ_API_KEY", "")
    if key.startswith("gsk_"):
        return key
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                k = cfg.get("GROQ_API_KEY", "")
                if k.startswith("gsk_"):
                    return k
        except Exception:
            pass
    return key

def aplicar_edicion(orden_usuario: str):
    if not os.path.exists(SCRIPT_PATH):
        print(f"Error: No existe {SCRIPT_PATH}")
        return

    groq_key = obtener_groq_key()
    if not groq_key:
        print("Error: Se requiere GROQ_API_KEY en api_config.json o en el entorno.")
        return

    with open(SCRIPT_PATH, "r", encoding="utf-8") as f:
        escenas_actuales = json.load(f)

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

    print(f"[*] Analizando orden: '{orden_usuario}'...")
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

    resp = requests.post(url, headers=headers, json=payload, timeout=10)
    if resp.status_code != 200:
        print(f"Error en Groq: {resp.status_code} - {resp.text}")
        return

    data = resp.json()
    parche = json.loads(data["choices"]["message"]["content"])
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
