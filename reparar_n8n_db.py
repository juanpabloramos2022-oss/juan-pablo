import sqlite3
import shutil
import json
import os
import urllib.request
import urllib.error
from datetime import datetime

DB_PATH = r"C:\Users\Liliana Maceas\.n8n\database.sqlite"
BACKUP_PATH = r"C:\Users\Liliana Maceas\.n8n\database.sqlite.bak_fix409"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ODlmMDc2My05MDg3LTQzNTYtODhkMS1kZTVmNjE3NDdhZDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNzhmMTQwNDQtNGU0OC00MWM0LWIyYjUtYWE3ODU0MTM2MzVmIiwiaWF0IjoxNzg4MjE0ODc5fQ.0Fy1xbAVN4uncCpPenvSJC2hWCkVau-QxP0d7lM39TQ"

def repair():
    print("=== PASO 1: RESPALDO DE BASE DE DATOS ===")
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"No se encontró la base de datos en {DB_PATH}")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print(f"Respaldo creado con éxito en: {BACKUP_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("\n=== PASO 2: CONSULTA DEL USUARIO ADMINISTRADOR ===")
    admin_user = cursor.execute("SELECT id, email, firstName, lastName, roleSlug FROM user LIMIT 1").fetchone()
    if not admin_user:
        raise RuntimeError("No se encontró usuario administrador en la tabla user.")
    
    admin_id = admin_user["id"]
    admin_name = f"{admin_user['firstName']} {admin_user['lastName']}"
    print(f"Usuario Admin localizado: ID={admin_id} ({admin_name} <{admin_user['email']}>), Rol={admin_user['roleSlug']}")

    # Obtener el personal project id
    proj_row = cursor.execute("SELECT projectId FROM project_relation WHERE userId = ?", (admin_id,)).fetchone()
    project_id = proj_row["projectId"] if proj_row else None
    print(f"Project ID asociado: {project_id}")

    print("\n=== PASO 3: LIQUIDAR CONFLICTOS 409 Y WORKFLOWS DUPLICADOS / HUÉRFANOS ===")
    # 3.1 Eliminar reservas de nuevo-video y gU10N000v337t1kt0k en webhook_entity
    webhooks_deleted = cursor.execute("DELETE FROM webhook_entity WHERE webhookPath = 'nuevo-video' OR workflowId = 'gU10N000v337t1kt0k'").rowcount
    print(f"Registros eliminados en webhook_entity (ruta nuevo-video / gU10N000v337t1kt0k): {webhooks_deleted}")

    # 3.2 Eliminar dependencias huérfanas de gU10N000v337t1kt0k
    deps_deleted = cursor.execute("DELETE FROM workflow_dependency WHERE workflowId = 'gU10N000v337t1kt0k'").rowcount
    print(f"Registros eliminados en workflow_dependency (gU10N000v337t1kt0k): {deps_deleted}")

    # 3.3 Si existiera gU10N000v337t1kt0k en workflow_entity o shared_workflow, limpiarlo
    wf_deleted = cursor.execute("DELETE FROM workflow_entity WHERE id = 'gU10N000v337t1kt0k'").rowcount
    print(f"Workflows duplicados con ID gU10N000v337t1kt0k eliminados de workflow_entity: {wf_deleted}")
    shared_del = cursor.execute("DELETE FROM shared_workflow WHERE workflowId = 'gU10N000v337t1kt0k'").rowcount
    print(f"Registros huérfanos eliminados en shared_workflow: {shared_del}")

    print("\n=== PASO 4: LOCALIZAR Y ACTUALIZAR WORKFLOW ACTIVO ===")
    # Localizar el workflow activo del formulario TikTok
    active_wf = cursor.execute("SELECT * FROM workflow_entity WHERE name LIKE '%Generador_Guiones%' OR id = 'JbHK9PqNVrhxtAQK'").fetchone()
    if not active_wf:
        raise RuntimeError("No se encontró el workflow activo del Generador de Guiones.")
    
    wf_id = active_wf["id"]
    print(f"Workflow activo identificado: ID={wf_id}, Nombre='{active_wf['name']}'")

    nodes = json.loads(active_wf["nodes"])
    modified_nodes = False
    for node in nodes:
        if "form" in node.get("type", "").lower() or "Formulario" in node.get("name", ""):
            params = node.get("parameters", {})
            if params.get("path") != "crear-video":
                params["path"] = "crear-video"
                modified_nodes = True
            if node.get("webhookId") != "crear-video":
                node["webhookId"] = "crear-video"
                modified_nodes = True
            print(f"Nodo '{node.get('name')}' configurado con path='{params.get('path')}' y webhookId='{node.get('webhookId')}'.")

    now_iso = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
    if modified_nodes or active_wf["active"] != 1:
        cursor.execute(
            "UPDATE workflow_entity SET nodes = ?, active = 1, updatedAt = ? WHERE id = ?",
            (json.dumps(nodes), now_iso, wf_id)
        )
        print(f"workflow_entity actualizado: active=1, updatedAt={now_iso}")
    else:
        cursor.execute("UPDATE workflow_entity SET active = 1 WHERE id = ?", (wf_id,))
        print("workflow_entity ya tenía los parámetros correctos, asegurado active=1.")

    print("\n=== PASO 5: VINCULAR PERMISOS EN shared_workflow ===")
    # Verificar si existe tabla shared_workflow y asegurar propiedad
    has_shared = cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='shared_workflow'").fetchone()[0]
    if has_shared:
        # Schema de shared_workflow: workflowId, projectId, role, createdAt, updatedAt
        target_project = project_id if project_id else admin_id
        cursor.execute("DELETE FROM shared_workflow WHERE workflowId = ?", (wf_id,))
        cursor.execute(
            "INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?, ?, 'workflow:owner', ?, ?)",
            (wf_id, target_project, now_iso, now_iso)
        )
        print(f"shared_workflow actualizado: workflowId={wf_id} -> projectId={target_project}, role='workflow:owner'")

    # Asegurar registro en webhook_entity para crear-video
    cursor.execute("DELETE FROM webhook_entity WHERE workflowId = ?", (wf_id,))
    cursor.execute(
        "INSERT INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength) VALUES (?, 'crear-video', 'GET', 'Formulario TikTok (Nuevo Video)', NULL, NULL)",
        (wf_id,)
    )
    cursor.execute(
        "INSERT INTO webhook_entity (workflowId, webhookPath, method, node, webhookId, pathLength) VALUES (?, 'crear-video', 'POST', 'Formulario TikTok (Nuevo Video)', NULL, NULL)",
        (wf_id,)
    )
    print(f"webhook_entity actualizado para crear-video (GET/POST) -> workflowId={wf_id}")

    conn.commit()
    conn.close()
    print("\nTransacción en SQLite confirmada exitosamente.")

    print("\n=== PASO 6: SINCRONIZAR CON LA API REST DE N8N ===")
    try:
        # Reactivar el workflow a través de la API para que n8n recargue sus listeners en memoria
        req = urllib.request.Request(
            f"http://localhost:5678/api/v1/workflows/{wf_id}/activate",
            data=b"{}",
            headers={"X-N8N-API-KEY": API_KEY, "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req) as response:
            res_body = json.loads(response.read().decode("utf-8"))
            print(f"API n8n /activate respuesta: ID={res_body.get('id')}, Active={res_body.get('active')}")
    except Exception as e:
        print(f"Aviso al invocar /activate en API n8n: {e}")

    print("\n=== PASO 7: ACTUALIZAR ARCHIVO WORKFLOW LOCAL ===")
    local_wf_file = r"c:\tiktok\workflow_generador_guiones.json"
    if os.path.exists(local_wf_file):
        try:
            with open(local_wf_file, "r", encoding="utf-8") as f:
                content = json.load(f)
            content["id"] = wf_id
            content["active"] = True
            for n in content.get("nodes", []):
                if "form" in n.get("type", "").lower():
                    n["parameters"]["path"] = "crear-video"
                    n["webhookId"] = "crear-video"
            with open(local_wf_file, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2, ensure_ascii=False)
            print(f"Archivo local '{local_wf_file}' sincronizado con ID={wf_id} y path='crear-video'.")
        except Exception as err:
            print(f"Error actualizando archivo local: {err}")

if __name__ == "__main__":
    repair()
