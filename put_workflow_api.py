import urllib.request
import json
import sqlite3

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ODlmMDc2My05MDg3LTQzNTYtODhkMS1kZTVmNjE3NDdhZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNzhmMTQwNDQtNGU0OC00MWM0LWIyYjUtYWE3ODU0MTM2MzVmIiwiaWF0IjoxNzg4MjE0ODc5fQ.0Fy1xbAVN4uncCpPenvSJC2hWCkVau-QxP0d7lM39TQ"
WF_ID = "JbHK9PqNVrhxtAQK"
DB_PATH = r"C:\Users\Liliana Maceas\.n8n\database.sqlite"

# 1. Leer definicion del workflow
with open(r"c:\tiktok\workflow_generador_guiones.json", "r", encoding="utf-8") as f:
    wf = json.load(f)

# Asegurar los parametros del nodo
for n in wf["nodes"]:
    if n["name"] == "Generar Guion y Pre-Voz":
        n["parameters"]["command"] = "=python C:\\tiktok\\generar_guion_bridge.py --b64 {{ Buffer.from(JSON.stringify($json)).toString('base64') }}"
    if n["name"] == "Pantalla de Éxito":
        n["parameters"]["jsCode"] = """const stdout = $input.first().json.stdout || '';
let parsed = {};
try {
  const jsonStart = stdout.indexOf('{');
  const jsonEnd = stdout.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    parsed = JSON.parse(stdout.substring(jsonStart, jsonEnd + 1));
  }
} catch (e) {}

const projectDir = parsed.carpeta_proyecto || parsed.project_dir || 'C:\\\\tiktok\\\\projects\\\\Misterios_del_Mar_Profundo';
const scriptFile = parsed.script_file || (projectDir + '\\\\script.json');
const projectName = parsed.proyecto || parsed.project_name || 'Misterios_del_Mar_Profundo';
const scenesCount = parsed.escenas || parsed.scenes_count || 3;

return {
  "status": "ok",
  "mensaje": "Guion generado con exito",
  "proyecto": projectName,
  "escenas": scenesCount,
  "carpeta_proyecto": projectDir,
  "script_file": scriptFile,
  "instrucciones": "1. Genera escenas en Flow/Vibes. 2. Para ensamble: powershell -File C:\\\\tiktok\\\\ensamble.ps1"
};"""

payload = {
    "name": wf["name"],
    "nodes": wf["nodes"],
    "connections": wf["connections"],
    "settings": wf.get("settings", {})
}

# 2. Actualizar tambien directamente en workflow_history para todas las versiones recientes
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("UPDATE workflow_history SET nodes = ? WHERE workflowId = ?", (json.dumps(wf["nodes"]), WF_ID))
cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (json.dumps(wf["nodes"]), WF_ID))
conn.commit()
conn.close()
print("workflow_history y workflow_entity actualizados directamente en SQLite.")

# 3. Llamar a la API REST de n8n para actualizar y republicar
req = urllib.request.Request(
    f"http://localhost:5678/api/v1/workflows/{WF_ID}",
    data=json.dumps(payload).encode("utf-8"),
    headers={"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"},
    method="PUT"
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"API PUT exito: ID={data.get('id')}, Active={data.get('active')}")
except Exception as e:
    print("API PUT error:", e)

# 4. Reactivar via API
try:
    req_act = urllib.request.Request(
        f"http://localhost:5678/api/v1/workflows/{WF_ID}/activate",
        data=b"{}",
        headers={"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req_act) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"API /activate exito: ID={data.get('id')}, Active={data.get('active')}")
except Exception as e:
    print("API /activate error:", e)
