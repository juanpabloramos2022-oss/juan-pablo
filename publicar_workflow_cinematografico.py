import urllib.request
import json
import sqlite3

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ODlmMDc2My05MDg3LTQzNTYtODhkMS1kZTVmNjE3NDdhZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNzhmMTQwNDQtNGU0OC00MWM0LWIyYjUtYWE3ODU0MTM2MzVmIiwiaWF0IjoxNzg4MjE0ODc5fQ.0Fy1xbAVN4uncCpPenvSJC2hWCkVau-QxP0d7lM39TQ"
WF_ID = "JbHK9PqNVrhxtAQK"
DB_PATH = r"C:\Users\Liliana Maceas\.n8n\database.sqlite"
LOCAL_WF_FILE = r"c:\tiktok\workflow_generador_guiones.json"

nodes = [
    {
        "parameters": {
            "path": "crear-video",
            "formTitle": "Factoría TikTok V33.7: Generador Cinematográfico (Pacing Variable)",
            "formDescription": "Ingresa la premisa o guion completo y configura el ritmo dramático y estilo visual (límite inquebrantable de 5.0s por toma para Google Flow / Vibes).",
            "formFields": {
                "values": [
                    {
                        "fieldLabel": "contenido_input",
                        "fieldType": "textarea",
                        "requiredField": True
                    },
                    {
                        "fieldLabel": "modo_trabajo",
                        "fieldType": "dropdown",
                        "defaultValue": "Crear Guion desde Idea",
                        "fieldOptions": {
                            "values": [
                                {"option": "Crear Guion desde Idea"},
                                {"option": "Segmentar y Adaptar mi Guion"}
                            ]
                        }
                    },
                    {
                        "fieldLabel": "estilo_ritmo",
                        "fieldType": "dropdown",
                        "defaultValue": "Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)",
                        "fieldOptions": {
                            "values": [
                                {"option": "Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)"},
                                {"option": "Frenético Viral (Tomas rápidas de 1.5s a 2.5s)"},
                                {"option": "Tensión / Documental (Tomas sostenidas de 3.5s a 5s)"}
                            ]
                        }
                    },
                    {
                        "fieldLabel": "estilo_visual",
                        "fieldType": "dropdown",
                        "defaultValue": "Cinemático Oscuro Hiperrealista (Lente 35mm, sombras profundas)",
                        "fieldOptions": {
                            "values": [
                                {"option": "Cinemático Oscuro Hiperrealista (Lente 35mm, sombras profundas)"},
                                {"option": "Documental Histórico / Archivo Vintage"},
                                {"option": "Monigote 3D / Plastilina Claymation"},
                                {"option": "Fotografía Científica Macro"}
                            ]
                        }
                    },
                    {
                        "fieldLabel": "nicho",
                        "fieldType": "dropdown",
                        "defaultValue": "Misterio",
                        "fieldOptions": {
                            "values": [
                                {"option": "Misterio"},
                                {"option": "Psicología"},
                                {"option": "Ciencia"},
                                {"option": "Finanzas"},
                                {"option": "Historia"},
                                {"option": "Terror"},
                                {"option": "Curiosidades"}
                            ]
                        }
                    },
                    {
                        "fieldLabel": "escenas_total",
                        "fieldType": "dropdown",
                        "defaultValue": "3 escenas [~10s]",
                        "fieldOptions": {
                            "values": [
                                {"option": "3 escenas [~10s]"},
                                {"option": "5 escenas [~16s]"},
                                {"option": "7 escenas [~24s]"}
                            ]
                        }
                    },
                    {
                        "fieldLabel": "voz",
                        "fieldType": "dropdown",
                        "defaultValue": "[Gemini] Charon (Misterio y Tensión Oscura)",
                        "fieldOptions": {
                            "values": [
                                {"option": "[Gemini] Charon (Misterio y Tensión Oscura)"},
                                {"option": "[Gemini] Puck (Cinemático y Viral Dinámico)"},
                                {"option": "[Gemini] Kore (Psicología y Ciencia Profunda)"},
                                {"option": "[Gemini] Fenrir (Autoridad y Documental Crudo)"},
                                {"option": "[Gemini] Aoede (Dramático y Teatral)"},
                                {"option": "es-ES-AlvaroNeural (Edge-TTS Rápido $0)"},
                                {"option": "es-MX-JorgeNeural (Edge-TTS Documental)"}
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

// Compatibilidad: contenido_input o idea_tema
const rawContent = item.contenido_input || item.idea_tema || item.idea || 'El secreto del manuscrito Voynich';
const cleanIdea = String(rawContent).replace(/["'\\\\\\r\\n]/g, ' ').trim();

const modoTrabajo = String(item.modo_trabajo || 'Crear Guion desde Idea').replace(/["'\\\\\\r\\n]/g, ' ').trim();
const estiloRitmo = String(item.estilo_ritmo || 'Híbrido Cinematográfico (Alternar 1.5s, 3s y 5s)').replace(/["'\\\\\\r\\n]/g, ' ').trim();
const estiloVisual = String(item.estilo_visual || 'Cinemático Oscuro Hiperrealista (Lente 35mm, sombras profundas)').replace(/["'\\\\\\r\\n]/g, ' ').trim();
const cleanNicho = String(item.nicho || 'Misterio').replace(/["'\\\\\\r\\n]/g, ' ').trim();

let escenas = 3;
const escStr = String(item.escenas_total || '');
if (escStr.includes('7')) escenas = 7;
else if (escStr.includes('5')) escenas = 5;
else if (escStr.includes('3')) escenas = 3;

const cleanVoz = String(item.voz || 'es-ES-AlvaroNeural').trim();
const cleanMusica = String(item.musica || 'ambient_cinematic.mp3').trim();

// Comando seguro para invocar el puente Python
const cmd = `python C:\\\\tiktok\\\\generar_guion_bridge.py --idea "${cleanIdea}" --modo-trabajo "${modoTrabajo}" --ritmo "${estiloRitmo}" --visual "${estiloVisual}" --nicho "${cleanNicho}" --escenas ${escenas} --voz "${cleanVoz}" --musica "${cleanMusica}"`;

return [{
  json: {
    command: cmd,
    contenido_input: cleanIdea,
    modo_trabajo: modoTrabajo,
    estilo_ritmo: estiloRitmo,
    estilo_visual: estiloVisual,
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

const projectDir = parsed.carpeta_proyecto || parsed.project_dir || 'C:\\\\tiktok\\\\projects\\\\';
const scriptFile = parsed.script_file || (projectDir + '\\\\script.json');
const projectName = parsed.proyecto || parsed.project_name || 'proyecto';
const scenesCount = parsed.escenas || parsed.scenes_count || 3;
const duraciones = (parsed.duraciones_escenas && parsed.duraciones_escenas.length > 0)
  ? parsed.duraciones_escenas.map(d => d + 's').join(' | ')
  : '1.8s | 3.2s | 4.8s';

return {
  "status": "ok",
  "mensaje": "¡Guion cinematográfico generado con pacing dinámico!",
  "proyecto": projectName,
  "escenas": scenesCount,
  "pacing_dinamico": duraciones,
  "techo_maximo_segundos": parsed.max_duracion || 4.8,
  "ritmo": parsed.ritmo || "Híbrido Cinematográfico (1.5s - 5.0s)",
  "estilo_visual": parsed.estilo_visual || "Cinemático Oscuro Hiperrealista",
  "carpeta_proyecto": projectDir,
  "script_file": scriptFile,
  "instrucciones": "1. Abre Google Flow / Vibes AI y genera los clips visuales. 2. Para ensamble nativo FFmpeg: powershell -File C:\\\\tiktok\\\\ensamble.ps1"
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
print("1. Archivo local workflow_generador_guiones.json actualizado.")

# 2. Guardar en SQLite
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("UPDATE workflow_entity SET nodes = ?, connections = ? WHERE id = ?", (json.dumps(nodes), json.dumps(connections), WF_ID))
cursor.execute("UPDATE workflow_history SET nodes = ?, connections = ? WHERE workflowId = ?", (json.dumps(nodes), json.dumps(connections), WF_ID))
conn.commit()
conn.close()
print("2. Base de datos SQLite actualizada.")

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
        print(f"3. API PUT ok: ID={data.get('id')}, Active={data.get('active')}")
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
        print(f"4. API /activate ok: ID={data.get('id')}, Active={data.get('active')}")
except Exception as e:
    print("API /activate error:", e)
