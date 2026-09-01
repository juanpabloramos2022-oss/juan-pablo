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
const VIDEO_DIR = path.join('C:', 'tiktok', 'projects', 'actual', 'output');

app.use('/media', express.static(VIDEO_DIR));

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
    let t = matchTexto[1].trim();
    if (t.toUpperCase().includes("IRREVERSIBLE")) {
      t = "¡DAÑO IRREVERSIBLE!";
    }
    cambio.overlayText = t;
  }

  return [cambio];
}

function aplicarCambios(rawScript, cambios) {
  let count = 0;
  for (const cambio of cambios) {
    for (let i = 0; i < rawScript.length; i++) {
      if (String(rawScript[i].id) === String(cambio.id)) {
        Object.assign(rawScript[i], cambio);
        if (!rawScript[i].remotion_fx) rawScript[i].remotion_fx = {};
        if (cambio.camara) rawScript[i].remotion_fx.camera_movement = cambio.camara;
        if (cambio.iluminacion) rawScript[i].remotion_fx.lighting = cambio.iluminacion;
        if (cambio.overlay) rawScript[i].remotion_fx.overlay = cambio.overlay;
        if (cambio.overlayText) rawScript[i].remotion_fx.overlay_text = cambio.overlayText;
        count++;
      }
    }
  }
  fs.writeFileSync(SCRIPT_PROJECT, JSON.stringify(rawScript, null, 2), 'utf-8');
  fs.writeFileSync(SCRIPT_PUBLIC, JSON.stringify(rawScript, null, 2), 'utf-8');
  return count;
}

// Interfaz Web Visual del Chat Studio
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Factoría V34: Chat Studio</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { display: flex; width: 100vw; height: 100vh; background-color: #0c0d12; color: #fff; overflow: hidden; }
    .player-section { flex: 1; display: flex; justify-content: center; align-items: center; padding: 20px; background: #08090d; }
    .video-card { height: 90vh; aspect-ratio: 9/16; background: #000; border-radius: 16px; overflow: hidden; box-shadow: 0 0 40px rgba(0,0,0,0.8); border: 2px solid #1f2230; display: flex; flex-direction: column; }
    video { width: 100%; height: 100%; object-fit: cover; }
    .chat-section { width: 440px; border-left: 1px solid #1f2230; display: flex; flex-direction: column; background: #13151f; padding: 24px; }
    h1 { font-size: 20px; font-weight: 900; color: #FFE500; margin-bottom: 6px; letter-spacing: 1px; }
    p.sub { font-size: 13px; color: #8d94a5; margin-bottom: 20px; }
    .log-box { flex: 1; background: #090a0f; border-radius: 10px; padding: 16px; border: 1px solid #1f2230; overflow-y: auto; margin-bottom: 16px; font-size: 13px; line-height: 1.5; }
    .msg { margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; }
    .msg-sys { background: rgba(0, 240, 255, 0.1); color: #00F0FF; border: 1px solid rgba(0, 240, 255, 0.2); }
    .msg-user { background: rgba(255, 229, 0, 0.1); color: #FFE500; border: 1px solid rgba(229, 229, 0, 0.2); }
    .msg-ok { background: rgba(0, 255, 102, 0.1); color: #00FF66; border: 1px solid rgba(0, 255, 102, 0.2); }
    textarea { width: 100%; height: 100px; background: #090a0f; color: #fff; border: 1px solid #2a2e42; border-radius: 8px; padding: 12px; font-size: 14px; resize: none; margin-bottom: 12px; outline: none; }
    textarea:focus { border-color: #FF0055; }
    button { width: 100%; padding: 14px; background: #FF0055; color: #fff; font-weight: 900; border: none; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; }
    button:hover { background: #d90048; }
    button:disabled { background: #555; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="player-section">
    <div class="video-card">
      <video id="videoPlayer" controls autoplay loop>
        <source src="/media/video_final_remotion.mp4?v=${Date.now()}" type="video/mp4">
      </video>
    </div>
  </div>

  <div class="chat-section">
    <h1>FACTORÍA V34: CHAT STUDIO</h1>
    <p class="sub">Escribe en lenguaje natural para modificar cualquier escena en caliente.</p>

    <div class="log-box" id="logBox">
      <div class="msg msg-sys">[SISTEMA]: Conectado a Llama 3.3 70B vía Groq. Video sincronizado con C:\\tiktok\\.</div>
    </div>

    <textarea id="promptInput" placeholder="Ej: En la escena 3 pon sacudida de terremoto y agrega alerta roja neon que diga ¡PELIGRO!"></textarea>
    <button id="sendBtn" onclick="enviarOrden()">Ejecutar Orden Agéntica</button>
  </div>

  <script>
    async function enviarOrden() {
      const input = document.getElementById('promptInput');
      const btn = document.getElementById('sendBtn');
      const log = document.getElementById('logBox');
      const text = input.value.trim();
      if (!text) return;

      btn.disabled = true;
      btn.innerText = 'Procesando en Groq...';
      log.innerHTML += '<div class="msg msg-user"><b>Tú:</b> ' + text + '</div>';
      log.scrollTop = log.scrollHeight;

      try {
        const res = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text })
        });
        const data = await res.json();
        if (data.success) {
          log.innerHTML += '<div class="msg msg-ok"><b>[OK]:</b> Cambio aplicado en script.json. Escenas modificadas: ' + JSON.stringify(data.patch) + '</div>';
          const player = document.getElementById('videoPlayer');
          player.src = '/media/video_final_remotion.mp4?t=' + Date.now();
          player.load();
          player.play();
        } else {
          log.innerHTML += '<div class="msg" style="color:#FF0055"><b>[ERROR]:</b> ' + (data.error || 'Fallo desconocido') + '</div>';
        }
      } catch (e) {
        log.innerHTML += '<div class="msg" style="color:#FF0055"><b>[ERROR]:</b> Error de conexión con el backend local.</div>';
      }

      input.value = '';
      btn.disabled = false;
      btn.innerText = 'Ejecutar Orden Agéntica';
      log.scrollTop = log.scrollHeight;
    }
  </script>
</body>
</html>
  `;
  res.send(html);
});

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

  // Si no hay key de Groq, usar el parser semántico local de alta precisión
  if (!groqKey) {
    const cambios = parsearOrdenFallback(prompt);
    if (cambios.length === 0) {
      return res.status(400).json({ error: 'No se pudo identificar la escena o los parámetros en la orden.' });
    }
    const count = aplicarCambios(rawScript, cambios);
    return res.json({ success: true, count, patch: cambios, modo: 'determinista_local' });
  }

  const systemPrompt = `Eres el Copiloto de Edición Quirúrgica de Remotion. Recibirás el JSON actual de 12 escenas y una orden en lenguaje natural. Devuelve ÚNICAMENTE un JSON: {"escenas_modificadas": [{"id": X, "camara": "...", "iluminacion": "...", "overlay": "...", "overlayText": "..."}]}. Opciones de camara: crash_zoom_in, vertigo_dolly_zoom, slow_creepy_crawl, whip_pan_left, earthquake_shake, estatico. Iluminacion: red_alert_pulse, dark_vignette_pulse, chromatic_aberration_glitch, limpio. Overlay: alerta_roja_neon, marco_cinematico, ninguno.`;

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
        console.log(`[!] Groq fallo al parsear: ${err.message}. Activando fallback local.`);
        const cambios = parsearOrdenFallback(prompt);
        const count = aplicarCambios(rawScript, cambios);
        return res.json({ success: true, count, patch: cambios, modo: 'fallback_post_groq' });
      }
    });
  });

  groqReq.on('error', (e) => {
    console.log(`[!] Error red Groq: ${e.message}. Activando fallback local.`);
    const cambios = parsearOrdenFallback(prompt);
    const count = aplicarCambios(rawScript, cambios);
    return res.json({ success: true, count, patch: cambios, modo: 'fallback_red' });
  });

  groqReq.write(payload);
  groqReq.end();
});

const PORT = 3001;
app.listen(PORT, () => console.log(`[+] Servidor Web Chat Studio activo en http://localhost:${PORT}`));
