import json

with open(r"C:\tiktok\projects\El_secreto_del_manuscrito_Voynich\script.json", "r", encoding="utf-8") as f:
    data = json.load(f)

meta = data.get("project_meta", {})
print("==================================================")
print("VERIFICACIÓN DE SCRIPT CINEMATOGRÁFICO")
print("  Proyecto:", meta.get("project_name"))
print("  Nicho:", meta.get("niche"))
print("  Modo Trabajo:", meta.get("modo_trabajo"))
print("  Estilo Ritmo:", meta.get("estilo_ritmo"))
print("  Estilo Visual:", meta.get("estilo_visual"))
print("  Total Escenas:", len(data.get("scenes", [])))
print("==================================================")

durations = []
for sc in data.get("scenes", []):
    dur = sc.get("duracion_estimada_segundos")
    durations.append(dur)
    rhythm = sc.get("tipo_ritmo")
    pv = sc.get("prompt_visual", "")
    words_pv = len(pv.split())
    narr = sc.get("narration", "")
    words_narr = len(narr.split())
    
    print(f"\n[Escena {sc.get('scene_number')}] Ritmo: {rhythm.upper()} | Duración: {dur}s")
    print(f"  Narración ({words_narr} palabras): {narr}")
    print(f"  Prompt Visual (+100 palabras? -> {words_pv} palabras):")
    print(f"    {pv[:180]}...")
    if "hook_b" in sc:
        print(f"  Hook B: {sc.get('hook_b')}")

print("\n==================================================")
print(f"Validación Techo Físico (<= 5.0s): {all(d <= 5.0 for d in durations)} (Máx: {max(durations)}s)")
print(f"Validación Mínimo (>= 1.5s): {all(d >= 1.5 for d in durations)} (Mín: {min(durations)}s)")
print(f"Pacing Dinámico Variable: {durations}")
print("==================================================")
