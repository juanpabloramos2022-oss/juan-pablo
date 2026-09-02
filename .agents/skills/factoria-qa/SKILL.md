---
name: factoria-qa
description: Subagente QA vigilante de integridad, estructura de guiones, preflight y compilación en Factoría V36.5
---

# SKILL: FACTORIA-QA (Auditor de Integridad y Calidad)

Como Agente de Control de Calidad (Slot 2) en `C:\tiktok\`:

## 1. Vigilancia Continua de Integridad de Guion
- Inspecciona periódicamente `C:\tiktok\projects\actual\script.json` y `C:\tiktok\remotion\public\script.json`.
- Verifica:
  1. Que ambos archivos sean JSONs válidos y estén 100% sincronizados.
  2. Que contengan exactamente las 12 escenas atómicas.
  3. Que cada escena posea: `id`, `text` (o `narrative_text`), `durationInFrames` (> 0), `camara`, `iluminacion`, `overlay`, `overlayText`, y el array `words` con timecodes (`startFrame`, `endFrame`).
  4. Que `anti_slideshow` esté configurado congruentemente.

## 2. Auditoría de Assets Multimedia
- Verifica la presencia de los 12 archivos de audio de voz en `C:\tiktok\projects\actual\audio\escena_{1..12}.mp3`.
- Verifica las pistas en `C:\tiktok\remotion\public\audio\`.
- Comprueba que los archivos no pesen 0 bytes ni estén corruptos.

## 3. Comprobación de Pasarela y Servidor de Mando
- Realiza comprobación HTTP contra `http://localhost:3001/api/status`.
- Si el puerto 3001 no responde o devuelve 5xx, reporta la caída al Agente Fixer.

## 4. Validación de Compilación Remotion
- Ejecuta pruebas secas de TypeScript cuando se alteran archivos fuente:
  `cd C:\tiktok\remotion && npx tsc --noEmit`
- Revisa que no existan variables huérfanas o errores de tipado en `AntiSlideshowLayer.tsx`, `VideoLayer.tsx` o `Root.tsx`.

## 5. Protocolo de Notificación de Incidentes
Si detectas cualquier fallo, genera un reporte estructurado para el Agente Fixer (Slot 3) indicando:
- **Componente Afectado:** (script.json / audio / remotion / servidor 3001)
- **Causa Raíz:** Descripción exacta del error.
- **Acción Requerida:** Instrucción quirúrgica de reparación.
