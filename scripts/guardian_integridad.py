"""
guardian_integridad.py - Inspección estricta de imágenes pre-compilación y hot-swap.
Garantiza que Remotion nunca compile a ciegas con assets corruptos.
"""

import os
import sys
import time
import json
import subprocess
from PIL import Image

IMAGES_DIR = r"C:\tiktok\projects\actual\images"
SCRIPT_PATH = r"C:\tiktok\projects\actual\script.json"
REGENERAR_SCRIPT = r"C:\tiktok\regenerar_escena.py"
NUM_ESCENAS = 12
MAX_REINTENTOS = 2
TIMEOUT_DESCARGA = 20 # Segundos de espera por imagen descargada

def validar_imagen(ruta_img):
    """Verifica existencia, tamaño mínimo en KB y resolución 9:16 (1080x1920)."""
    if not os.path.exists(ruta_img):
        return False, "Archivo no existe"

    # Verificar que no esté en 0 KB (mínimo 15 KB para una imagen real)
    size_kb = os.path.getsize(ruta_img) / 1024
    if size_kb < 15.0:
        return False, f"Archivo incompleto o corrupto ({size_kb:.1f} KB)"

    try:
        with Image.open(ruta_img) as img:
            img.verify() # Comprueba integridad del archivo

        # Reabrir para chequear dimensiones
        with Image.open(ruta_img) as img:
            w, h = img.size
            if w != 1080 or h != 1920:
                # Tolerancia si la relación de aspecto es vertical 9:16
                aspect_ratio = h / w
                if abs(aspect_ratio - (1920 / 1080)) > 0.05:
                    return False, f"Aspect ratio no es 9:16 ({w}x{h})"
    except Exception as e:
        return False, f"Error leyendo cabecera de imagen: {e}"

    return True, "OK"

def regenerar_escena_hot_swap(escena_num):
    """Dispara el reemplazo en caliente de la escena dañada."""
    print(f"[GUARDIÁN] ALERTA: Disparando Hot-Swap para Escena {escena_num}...")
    cmd = [sys.executable, REGENERAR_SCRIPT, "--escena", str(escena_num)]
    try:
        subprocess.run(cmd, check=True)
    except Exception as e:
        print(f"[GUARDIÁN] Falló comando de regeneración: {e}")

def main():
    print("[GUARDIÁN] Iniciando inspección de integridad de assets en 9:16...")
    todos_validos = False

    num_escenas = NUM_ESCENAS
    if os.path.exists(SCRIPT_PATH):
        try:
            with open(SCRIPT_PATH, "r", encoding="utf-8") as f:
                sdata = json.load(f)
                if "scenes" in sdata and len(sdata["scenes"]) > 0:
                    num_escenas = len(sdata["scenes"])
        except Exception:
            pass

    for intento in range(MAX_REINTENTOS + 1):
        errores = 0
        for i in range(1, num_escenas + 1):
            nombre_img = f"escena_{i}.png"
            ruta_img = os.path.join(IMAGES_DIR, nombre_img)

            valida, razon = validar_imagen(ruta_img)
            if not valida:
                errores += 1
                print(f"[GUARDIÁN] Escena {i} INVÁLIDA: {razon}")
                if intento < MAX_REINTENTOS:
                    regenerar_escena_hot_swap(i)
                    print(f"[GUARDIÁN] Esperando regeneración ({TIMEOUT_DESCARGA}s)...")
                    time.sleep(TIMEOUT_DESCARGA)
                else:
                    print(f"[GUARDIÁN] Superado límite de reintentos para escena {i}.")

        if errores == 0:
            todos_validos = True
            break

    if todos_validos:
        print("[GUARDIÁN] Inspección completada al 100%. Todos los assets son válidos. LUZ VERDE PARA REMOTION.")
        sys.exit(0)
    else:
        print("[GUARDIÁN] ABORTO DE COMPILACIÓN: Persisten assets corruptos o faltantes.")
        sys.exit(1)

if __name__ == "__main__":
    main()
