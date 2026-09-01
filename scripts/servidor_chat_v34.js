const path = require('path');
// Permitir resolver express y cors instalados en remotion/node_modules
module.paths.push(path.join(__dirname, '..', 'remotion', 'node_modules'));

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

const SCRIPT_PROJECT = path.join('C:', 'tiktok', 'projects', 'actual', 'script.json');
const SCRIPT_PUBLIC = path.join('C:', 'tiktok', 'remotion', 'public', 'script.json');
const CONFIG_PATH = path.join('C:', 'tiktok', 'api_config.json');

const VALID_CAMARAS = ["crash_zoom_in", "vertigo_dolly_zoom", "slow_creepy_crawl", "whip_pan_left", "earthquake_shake", "estatico"];
const VALID_ILUMINACION = ["red_alert_pulse", "dark_vignette_pulse", "chromatic_aberration_glitch", "limpio"];
const VALID_OVERLAYS = ["alerta_roja_neon", "marco_cinematico", "ninguno"];

function getGroqKey() {
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_')) return process.env.GROQ_API_KEY;
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      const k = cfg.GROQ_API_KEY || cfg.groq_api_key || cfg.api_key || '';
      if (typeof k === 'string' && k.startsWith('gsk_')) return k;
    } catch (e) {}
  }
  return '';
}

function parsearOrdenFallback(orden) {
  const cambio = {};
  const matchEscena = orden.match(/(?:escena|scene)\s*(\d+)/i);
  if (!matchEscena) return [];
  cambio.id = parseInt(matchEscena[1], 10);

  for (const cam of VALID_CAMARAS) {
    if (orden.toLowerCase().includes(cam)) {
      cambio.camara = cam;
      break;
    }
  }

  for (const ilum of VALID_ILUMINACION) {
    if (orden.toLowerCase().includes(ilum)) {
      cambio.iluminacion = ilum;
      break;
    }
  }

  for (const ov of VALID_OVERLAYS) {
    if (orden.toLowerCase().includes(ov)) {
      cambio.overlay = ov;
      break;
    }
  }

  const matchTexto = orden.match(/(?:con\s+el\s+texto|con\s+texto|texto|mensaje)\s*[:=]?\s*["']?([^"'\r\n]+?)["']?$/i);
  if (matchTexto) {
    cambio.overlayText = matchTexto[1].trim();
  }

  return [cambio];
}

function aplicarCambios(rawScript, cambios) {
  let modificadas = 0;
  for (const cambio of cambios) {
    for (let i = 0; i < rawScript.length; i++) {
      if (String(rawScript[i].id) === String(cambio.id)) {
        Object.assign(rawScript[i], cambio);
        if (!rawScript[i].remotion_fx) rawScript[i].remotion_fx = {};
        if (cambio.camara) rawScript[i].remotion_fx.camera_movement = cambio.camara;
        if (cambio.iluminacion) rawScript[i].remotion_fx.lighting = cambio.iluminacion;
        if (cambio.overlay) rawScript[i].remotion_fx.overlay = cambio.overlay;
        if (cambio.overlayText) rawScript[i].remotion_fx.overlay_text = cambio.overlayText;
        modificadas++;
      }
    }
  }

  fs.writeFileSync(SCRIPT_PROJECT, JSON.stringify(rawScript, null, 2), 'utf-8');
  fs.writeFileSync(SCRIPT_PUBLIC, JSON.stringify(rawScript, null, 2), 'utf-8');
  return modificadas;
}

app.post('/api/edit', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  let rawScript = [];
  try {
    rawScript = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo leer script.json' });
  }

  const groqKey = getGroqKey();

  if (!groqKey) {
    console.log(`[*] Parseando orden localmente (fallback): "${prompt}"`);
    const cambios = parsearOrdenFallback(prompt);
    if (cambios.length === 0) {
      return res.status(400).json({ error: 'No se pudo identificar la escena o los parámetros en la orden.' });
    }
    const count = aplicarCambios(rawScript, cambios);
    return res.json({ success: true, count, patch: cambios, modo: 'determinista_local' });
  }

  const systemPrompt = `
Eres el Copiloto de Edición Quirúrgica de Remotion.
Recibirás el JSON actual de 12 escenas y una orden en lenguaje natural.
Devuelve ÚNICAMENTE un JSON con: {"escenas_modificadas": [{"id": X, "camara": "...", "iluminacion": "...", "overlay": "...", "overlayText": "..."}]}.
Opciones de camara: "crash_zoom_in", "vertigo_dolly_zoom", "slow_creepy_crawl", "whip_pan_left", "earthquake_shake", "estatico".
Opciones de iluminacion: "red_alert_pulse", "dark_vignette_pulse", "chromatic_aberration_glitch", "limpio".
Opciones de overlay: "alerta_roja_neon", "marco_cinematico", "ninguno".
`;

  const payload = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `JSON ACTUAL:\n${JSON.stringify(rawScript)}\n\nORDEN: ${prompt}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });

  const options = {
    hostname: 'api.groq.com',
    path: '/openai/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const groqReq = https.request(options, (groqRes) => {
    let data = '';
    groqRes.on('data', (chunk) => data += chunk);
    groqRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        const patch = JSON.parse(parsed.choices[0].message.content);
        const cambios = patch.escenas_modificadas || [];
        const count = aplicarCambios(rawScript, cambios);
        return res.json({ success: true, count, patch: cambios, modo: 'groq_cloud' });
      } catch (err) {
        // Fallback a parser local si falla Groq
        console.log(`[!] Groq error: ${err.message}. Activando fallback local.`);
        const cambios = parsearOrdenFallback(prompt);
        const count = aplicarCambios(rawScript, cambios);
        return res.json({ success: true, count, patch: cambios, modo: 'fallback_post_groq' });
      }
    });
  });

  groqReq.on('error', (e) => {
    console.log(`[!] Error de red Groq: ${e.message}. Activando fallback local.`);
    const cambios = parsearOrdenFallback(prompt);
    const count = aplicarCambios(rawScript, cambios);
    return res.json({ success: true, count, patch: cambios, modo: 'fallback_red' });
  });

  groqReq.write(payload);
  groqReq.end();
});

const PORT = 3001;
app.listen(PORT, () => console.log(`[+] Servidor de Edicion V34 activo en http://localhost:${PORT}`));
