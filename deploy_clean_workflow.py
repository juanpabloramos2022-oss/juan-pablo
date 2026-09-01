import urllib.request
import json
import sqlite3
from datetime import datetime

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ODlmMDc2My05MDg3LTQzNTYtODhkMS1kZTVmNjE3NDdhZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNzhmMTQwNDQtNGU0OC00MWM0LWIyYjUtYWE3ODU0MTM2MzVmIiwiaWF0IjoxNzg4MjE0ODc5fQ.0Fy1xbAVN4uncCpPenvSJC2hWCkVau-QxP0d7lM39TQ"
WF_ID = "JbHK9PqNVrhxtAQK"
DB_PATH = r"C:\Users\Liliana Maceas\.n8n\database.sqlite"
LOCAL_WF_FILE = r"c:\tiktok\workflow_generador_guiones.json"

nodes = [
    {
        "parameters": {
            "path": "crear-video",
            "formTitle": "Factoría TikTok V33.7: Generador Universal de Guiones",
            "formDescription": "Ingresa el tema y parámetros del video. La factoría redactará el guion y pre-generará las locuciones sincronizadas.",
            "formFields": {
                "values": [
                    {
                        "fieldLabel": "idea_tema",
                        "fieldType": "textarea",
                        "requiredField": True
                    },
                    {
                        "fieldLabel": "nicho",
                        "fieldType": "dropdown",
                        "defaultValue": "Misterio",
                        "fieldOptions": {
                            "values": [
                                {"option": "Misterio"},
                                {"option": "Finanzas"},
                                {"option": "Curiosidades"},
                                {"option": "Ciencia"},
                                {"option": "Historia"},
                                {"option": "Terror"}
                            ]
                        }
                    },
                    {
                        "fieldLabel": "escenas_total",
                        "fieldType": "dropdown",
                        "defaultValue": "3 escenas [~12s]",
                        "fieldOptions": {
                            "values": [
                                {"option": "3 escenas [~12s]"},
                                {"option": "5 escenas [~20s]"}
                            ]
                        }
                    },
                    {
                        "fieldLabel": "voz",
                        "fieldType": "dropdown",
                        "defaultValue": "es-ES-AlvaroNeural",
                        "fieldOptions": {
                            "values": [
                                {"option": "es-ES-AlvaroNeural"},
                                {"option": "es-MX-JorgeNeural"},
                                {"option": "es-ES-ElviraNeural"},
                                {"option": "en-US-BrianMultilingualNeural"}
                            ]
                        }
                    },
                    {
                        "fieldLabel": "musica",
                        "fieldType": "dropdown",
                        "defaultValue": "ambient_cinematic.mp3",
                        "fieldOptions": {
                            "values": [
                                {"option": "ambient_cinematic.mp3"},
                                {"option": "ambient_corporate.mp3"},
                                {"option": "sin_musica"}
                            ]
                        }
                    }
                ]
            },
            "responseMode": "lastNode",
            "options": {}
        },
        "id": "form-trigger-tiktok",
        "name": "Formulario TikTok (Nuevo Video)",
        "type": "n8n-nodes-base.formTrigger",
        "typeVersion": 2,
        "position": [200, 300],
        "webhookId": "crear-video"
    },
    {
        "parameters": {
            "jsCode": """const item = $input.first().json;
const cleanIdea = String(item.idea_tema || 'Misterios del Mar Profundo').replace(/["'\\\\\\r\\n]/g, ' ').trim();
const cleanNicho = String(item.nicho || 'Misterio').replace(/["'\\\\\\r\\n]/g, ' ').trim();
const escenas = String(item.escenas_total || '').includes('5') ? 5 : 3;
const cleanVoz = String(item.voz || 'es-ES-AlvaroNeural').trim();
const cleanMusica = String(item.musica || 'ambient_cinematic.mp3').trim();

// Comando directo a Python sin envoltura de PowerShell
const cmd = `python C:\\\\tiktok\\\\generar_guion_bridge.py --idea "${cleanIdea}" --nicho "${cleanNicho}" --escenas ${escenas} --voz "${cleanVoz}" --musica "${cleanMusica}"`;

return [{
  json: {
    command: cmd,
    idea_tema: cleanIdea,
    nicho: cleanNicho,
    escenas_total: escenas,
    voz: cleanVoz,
    musica: cleanMusica
  }
}];"""
        },
        "id": "code-prepare-command",
        "name": "Sanitizar y Preparar Comando",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [440, 300]
    },
    {
        "parameters": {
            "command": "={{ $json.command }}"
        },
        "id": "exec-generate-script-voice",
        "name": "Generar Guion y Pre-Voz",
        "type": "n8n-nodes-base.executeCommand",
        "typeVersion": 1,
        "position": [680, 300]
    },
    {
        "parameters": {
            "jsCode": """const stdout = $input.first().json.stdout || '';
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
  "instrucciones": "1. Genera escenas en Flow/Vibes. 2. Para ensamble nativo: powershell -File C:\\\\tiktok\\\\ensamble.ps1"
};"""
        },
        "id": "code-form-response",
        "name": "Pantalla de Éxito",
        "type": "n8n-nodes-base.code",
        "typeVersion": 2,
        "position": [920, 300]
    }
]

connections = {
    "Formulario TikTok (Nuevo Video)": {
        "main": [
            [
                {
                    "node": "Sanitizar y Preparar Comando",
                    "type": "main",
                    "index": 0
                }
            ]
        ]
    },
    "Sanitizar y Preparar Comando": {
        "main": [
            [
                {
                    "node": "Generar Guion y Pre-Voz",
                    "type": "main",
                    "index": 0
                }
            ]
        ]
    },
    "Generar Guion y Pre-Voz": {
        "main": [
            [
                {
                    "node": "Pantalla de Éxito",
                    "type": "main",
                    "index": 0
                }
            ]
        ]
    }
}

wf_data = {
    "id": WF_ID,
    "name": "Fabrica_V33_7_Generador_Guiones",
    "active": True,
    "nodes": nodes,
    "connections": connections,
    "settings": {
        "executionOrder": "v1"
    }
}

# 1. Guardar local
with open(LOCAL_WF_FILE, "w", encoding="utf-8") as f:
    json.dump(wf_data, f, indent=2, ensure_ascii=False)
print("Archivo local workflow_generador_guiones.json actualizado.")

# 2. Guardar en SQLite
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("UPDATE workflow_entity SET nodes = ?, connections = ? WHERE id = ?", (json.dumps(nodes), json.dumps(connections), WF_ID))
cursor.execute("UPDATE workflow_history SET nodes = ?, connections = ? WHERE workflowId = ?", (json.dumps(nodes), json.dumps(connections), WF_ID))
conn.commit()
conn.close()
print("Base de datos SQLite actualizada.")

# 3. PUT en API REST de n8n
payload = {
    "name": "Fabrica_V33_7_Generador_Guiones",
    "nodes": nodes,
    "connections": connections,
    "settings": {"executionOrder": "v1"}
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

# 4. Reactivar via API
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
