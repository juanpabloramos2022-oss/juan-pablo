import urllib.request
import uuid
import json
import re

url = "http://localhost:5678/form/crear-video"

# 1. Obtener los IDs de campo dinámicos del formulario
html = urllib.request.urlopen(url).read().decode("utf-8")
inputs = re.findall(r'<(?:textarea|select)[^>]+id=["\'](field-\d+)["\']', html)
print("Campos del formulario detectados:", inputs)

# Mapear valores a los campos
field_values = [
    "El secreto del manuscrito Voynich",
    "Crear Guion desde Idea",
    "Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)",
    "Cinemático Oscuro Hiperrealista (Lente 35mm, sombras profundas)",
    "Misterio",
    "3 escenas [~10s]",
    "es-ES-AlvaroNeural",
    "ambient_cinematic.mp3"
]

fields = {}
for i, f_id in enumerate(inputs):
    if i < len(field_values):
        fields[f_id] = field_values[i]

boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
body = bytearray()
for k, v in fields.items():
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
    body.extend(f"{v}\r\n".encode("utf-8"))
body.extend(f"--{boundary}--\r\n".encode("utf-8"))

req = urllib.request.Request(url, data=bytes(body), method="POST")
req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

print(f"Enviando POST cinematográfico a {url}...")
try:
    with urllib.request.urlopen(req, timeout=30) as response:
        print(f"HTTP Status: {response.status} OK")
        res_text = response.read().decode("utf-8", errors="replace")
        print("Response (primeros 500 chars):", res_text[:500])
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8', errors='replace')}")
except Exception as e:
    print(f"Error: {e}")
