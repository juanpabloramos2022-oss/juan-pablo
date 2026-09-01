import urllib.request
import json
import sqlite3

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ODlmMDc2My05MDg3LTQzNTYtODhkMS1kZTVmNjE3NDdhZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNzhmMTQwNDQtNGU0OC00MWM0LWIyYjUtYWE3ODU0MTM2MzVmIiwiaWF0IjoxNzg4MjE0ODc5fQ.0Fy1xbAVN4uncCpPenvSJC2hWCkVau-QxP0d7lM39TQ"
WF_ID = "JbHK9PqNVrhxtAQK"
DB_PATH = r"C:\Users\Liliana Maceas\.n8n\database.sqlite"
LOCAL_WF_FILE = r"c:\tiktok\workflow_generador_guiones.json"

with open(LOCAL_WF_FILE, "r", encoding="utf-8") as f:
    wf = json.load(f)

# Comando blindado contra comillas y caracteres especiales
safe_cmd = 'python C:\\tiktok\\generar_guion_bridge.py --idea "{{ ($json.idea_tema || \'\').replace(/[\\r\\n"\'\\\\]/g, \' \') }}" --nicho "{{ ($json.nicho || \'Misterio\').replace(/[\\r\\n"\'\\\\]/g, \' \') }}" --escenas {{ ($json.escenas_total || \'\').includes(\'5\') ? 5 : 3 }} --voz "{{ ($json.voz || \'es-ES-AlvaroNeural\').replace(/[\\r\\n"\'\\\\]/g, \' \') }}" --musica "{{ ($json.musica || \'ambient_cinematic.mp3\').replace(/[\\r\\n"\'\\\\]/g, \' \') }}"'

success_code = """const stdout = $input.first().json.stdout || '';
let parsed = {};
try {
  const jsonStart = stdout.indexOf('{');
  const jsonEnd = stdout.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    parsed = JSON.parse(stdout.substring(jsonStart, jsonEnd + 1));
  }
} catch (e) {}

const projectDir = parsed.carpeta_proyecto || parsed.project_dir || 'C:\\\\tiktok\\\\projects\\\\';
const scriptFile = parsed.script_file || (projectDir + '\\\\script.json');
const projectName = parsed.proyecto || parsed.project_name || 'proyecto';
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

for n in wf["nodes"]:
    if n["name"] == "Generar Guion y Pre-Voz":
        n["parameters"]["command"] = safe_cmd
    if n["name"] == "Pantalla de Éxito":
        n["parameters"]["jsCode"] = success_code

# 1. Guardar en JSON local
with open(LOCAL_WF_FILE, "w", encoding="utf-8") as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)
print("Archivo local workflow_generador_guiones.json actualizado.")

# 2. Guardar en SQLite (workflow_entity y workflow_history)
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("UPDATE workflow_entity SET nodes = ? WHERE id = ?", (json.dumps(wf["nodes"]), WF_ID))
cursor.execute("UPDATE workflow_history SET nodes = ? WHERE workflowId = ?", (json.dumps(wf["nodes"]), WF_ID))
conn.commit()
conn.close()
print("Base de datos SQLite actualizada.")

# 3. Actualizar via API REST de n8n
payload = {
    "name": wf["name"],
    "nodes": wf["nodes"],
    "connections": wf["connections"],
    "settings": wf.get("settings", {})
}

req = urllib.request.Request(
    f"http://localhost:5678/api/v1/workflows/{WF_ID}",
    data=json.dumps(payload).encode("utf-8"),
    headers={"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"},
    method="PUT"
)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"API PUT ok: ID={data.get('id')}, Active={data.get('active')}")
except Exception as e:
    print("API PUT error:", e)

# 4. Forzar recarga activando
req_act = urllib.request.Request(
    f"http://localhost:5678/api/v1/workflows/{WF_ID}/activate",
    data=b"{}",
    headers={"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"},
    method="POST"
)
try:
    with urllib.request.urlopen(req_act) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        print(f"API /activate ok: ID={data.get('id')}, Active={data.get('active')}")
except Exception as e:
    print("API /activate error:", e)
