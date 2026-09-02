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

// 1. RESOLUCIÓN DE CREDENCIALES
function getGroqKey() {
  const envKey = process.env.GROQ_API_KEY;
  if (envKey && envKey.startsWith('gsk_')) return envKey;
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      const k = cfg.GROQ_API_KEY || cfg.groq_api_key || cfg.api_key;
      if (k && k.startsWith('gsk_')) return k;
    } catch (e) {}
  }
  return '';
}

// 2. NORMALIZADOR LÉXICO: CONVERSOR DE PALABRAS A NÚMEROS (1-12)
function extraerNumeroEscena(texto) {
  const t = texto.toLowerCase();
  const digitMatch = t.match(/(?:escena|scene)\s*(\d+)/i);
  if (digitMatch) return parseInt(digitMatch[1], 10);

  const mapa = {
    'primera': 1, 'primer': 1, 'uno': 1, 'one': 1, 'inicio': 1,
    'segunda': 2, 'segundo': 2, 'dos': 2, 'two': 2,
    'tercera': 3, 'tercer': 3, 'tres': 3, 'three': 3,
    'cuarta': 4, 'cuarto': 4, 'cuatro': 4, 'four': 4,
    'quinta': 5, 'quinto': 5, 'cinco': 5, 'five': 5,
    'sexta': 6, 'sexto': 6, 'seis': 6, 'six': 6,
    'séptima': 7, 'septima': 7, 'séptimo': 7, 'septimo': 7, 'siete': 7, 'seven': 7,
    'octava': 8, 'octavo': 8, 'ocho': 8, 'eight': 8,
    'novena': 9, 'noveno': 9, 'nueve': 9, 'nine': 9,
    'décima': 10, 'decima': 10, 'décimo': 10, 'decimo': 10, 'diez': 10, 'ten': 10,
    'undécima': 11, 'undecima': 11, 'once': 11, 'eleven': 11,
    'duodécima': 12, 'duodecima': 12, 'doce': 12, 'twelve': 12, 'final': 12, 'última': 12, 'ultima': 12
  };

  for (const [palabra, num] of Object.entries(mapa)) {
    const regex = new RegExp(`(?:escena|scene)\\s+${palabra}\\b`, 'i');
    if (regex.test(t)) return num;
  }
  return null;
}

// 3. PARSER SEMÁNTICO LOCAL DE CONTINGENCIA (COMPRENSIÓN COLOQUIAL Y ACCIONES NEGATIVAS)
function parsearOrdenLocal(prompt) {
  const targetId = extraerNumeroEscena(prompt);
  if (!targetId) return [];

  const t = prompt.toLowerCase();
  const patch = { id: targetId };
  let modificado = false;

  // Acciones Negativas / Quitar Cartel u Overlay
  if (/quitar?|borrar?|eliminar?|apagar?|sin\s+cartel|sin\s+alerta/i.test(t) && /cartel|alerta|overlay|texto\s+flotante|letrero/i.test(t)) {
    patch.overlay = "ninguno";
    patch.overlayText = "";
    modificado = true;
  } else if (/alerta\s*roja|cartel|letrero|badge/i.test(t)) {
    patch.overlay = "alerta_roja_neon";
    const quoteMatch = prompt.match(/["']([^"']+)["']/);
    patch.overlayText = quoteMatch ? quoteMatch[1].toUpperCase() : "¡ALERTA!";
    modificado = true;
  } else if (/marco|viñeta|vineta|cinematico/i.test(t)) {
    patch.overlay = "marco_cinematico";
    modificado = true;
  }

  // Cámaras Coloquiales
  if (/terremoto|temblor|sacud/i.test(t)) {
    patch.camara = "earthquake_shake";
    modificado = true;
  } else if (/v[eé]rtigo|dolly/i.test(t)) {
    patch.camara = "vertigo_dolly_zoom";
    modificado = true;
  } else if (/zoom\s*(violento|fuerte|r[aá]pido|in)|crash/i.test(t)) {
    patch.camara = "crash_zoom_in";
    modificado = true;
  } else if (/lento|lenta|creep|crawl/i.test(t)) {
    patch.camara = "slow_creepy_crawl";
    modificado = true;
  } else if (/l[aá]tigo|whip|barrido/i.test(t)) {
    patch.camara = "whip_pan_left";
    modificado = true;
  } else if (/quieto|est[aá]tico|fijo/i.test(t)) {
    patch.camara = "estatico";
    modificado = true;
  }

  // Iluminación
  if (/quitar?\s*(luz|iluminaci[oó]n|efectos)|luz\s*normal|limpio/i.test(t)) {
    patch.iluminacion = "limpio";
    modificado = true;
  } else if (/pulso\s*rojo|alarma/i.test(t)) {
    patch.iluminacion = "red_alert_pulse";
    modificado = true;
  } else if (/oscuro|suspenso|viñeta\s*oscura/i.test(t)) {
    patch.iluminacion = "dark_vignette_pulse";
    modificado = true;
  } else if (/glitch|aberraci[oó]n/i.test(t)) {
    patch.iluminacion = "chromatic_aberration_glitch";
    modificado = true;
  }

  return modificado ? [patch] : [];
}

// 4. INTERFAZ WEB COMPLETA
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
    .video-card { height: 90vh; aspect-ratio: 9/16; background: #000; border-radius: 16px; overflow: hidden; box-shadow: 0 0 40px rgba(0,0,0,0.8); border: 2px solid #1f2230; }
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
    button { width: 100%; padding: 14px; background: #FF0055; color: #fff; font-weight: 900; border: none; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; }
    button:hover { background: #d90048; }
    button:disabled { background: #555; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="player-section">
    <div class="video-card">
      <video id="videoPlayer" controls autoplay loop>
        <source src="/media/video_final_remotion.mp4" type="video/mp4">
      </video>
    </div>
  </div>

  <div class="chat-section">
    <h1>FACTORÍA V34: CHAT STUDIO</h1>
    <p class="sub">Escribe en lenguaje natural para modificar cualquier escena en caliente.</p>

    <div class="log-box" id="logBox">
      <div class="msg msg-sys">[SISTEMA]: Compilador Semántico Universal activo (Groq Cloud Llama-3.3 + Respaldo Local).</div>
    </div>

    <textarea id="promptInput" placeholder="Ej: en la escena uno quita el cartel de arriba shock biologico"></textarea>
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
      btn.innerText = 'Interpretando orden...';
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
          log.innerHTML += '<div class="msg msg-ok"><b>[OK]:</b> Hot-Swap aplicado. Parche: ' + JSON.stringify(data.patch) + '</div>';
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

// 5. ENDPOINT /api/edit HÍBRIDO RESILIENTE
app.post('/api/edit', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  let rawScript = [];
  try {
    rawScript = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo leer script.json' });
  }

  function aplicarParche(patchArray) {
    for (const cambio of patchArray) {
      for (let i = 0; i < rawScript.length; i++) {
        if (String(rawScript[i].id) === String(cambio.id)) {
          Object.assign(rawScript[i], cambio);
          if (!rawScript[i].remotion_fx) rawScript[i].remotion_fx = {};
          if (cambio.camara) rawScript[i].remotion_fx.camera_movement = cambio.camara;
          if (cambio.iluminacion) rawScript[i].remotion_fx.lighting = cambio.iluminacion;
          if (cambio.overlay) rawScript[i].remotion_fx.overlay = cambio.overlay;
          if (cambio.overlayText !== undefined) rawScript[i].remotion_fx.overlay_text = cambio.overlayText;
        }
      }
    }
    fs.writeFileSync(SCRIPT_PROJECT, JSON.stringify(rawScript, null, 2), 'utf-8');
    fs.writeFileSync(SCRIPT_PUBLIC, JSON.stringify(rawScript, null, 2), 'utf-8');
    return res.json({ success: true, patch: patchArray });
  }

  const groqKey = getGroqKey();

  // Si no hay key de Groq, usar de inmediato el compilador local robusto
  if (!groqKey) {
    const localPatch = parsearOrdenLocal(prompt);
    if (localPatch.length === 0) {
      return res.status(400).json({ error: 'No se pudo identificar la escena (ej: escena 1, escena uno) o la acción solicitada.' });
    }
    return aplicarParche(localPatch);
  }

  // Si hay Groq, usar Llama 3.3 con Few-Shot exhaustivo de acciones negativas y coloquiales
  const systemPrompt = `
Eres un Asistente de Edición Cinematográfica en Remotion.
Recibirás el JSON de 12 escenas y una orden coloquial humana.
Devuelve ÚNICAMENTE un JSON: {"escenas_modificadas": [{"id": X, ...}]}.
REGLAS SEMÁNTICAS CRÍTICAS:
- Mapea palabras ordinales/cardinales ("uno", "primera", "dos") al número de id correspondiente.
- ACCIONES NEGATIVAS: Si el usuario dice "quita el cartel", "elimina la alerta", "borra el texto de arriba", debes asignar: "overlay": "ninguno", "overlayText": "".
- ACCIONES DE LUZ NEGATIVAS: Si dice "quita el efecto de luz" o "luz normal", debes asignar: "iluminacion": "limpio".
- CÁMARAS: "crash_zoom_in", "vertigo_dolly_zoom", "slow_creepy_crawl", "whip_pan_left", "earthquake_shake", "estatico".
- ILUMINACIÓN: "red_alert_pulse", "dark_vignette_pulse", "chromatic_aberration_glitch", "limpio".
- OVERLAYS: "alerta_roja_neon", "marco_cinematico", "ninguno".
`;

  const payload = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `JSON ACTUAL:\n${JSON.stringify(rawScript)}\n\nORDEN:\n${prompt}` }
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
        const mod = patch.escenas_modificadas || [];
        if (mod.length > 0) {
          return aplicarParche(mod);
        }
      } catch (err) {}
      // Fallback local si Groq no devolvió parche válido
      const localPatch = parsearOrdenLocal(prompt);
      if (localPatch.length > 0) return aplicarParche(localPatch);
      return res.status(400).json({ error: 'No se pudo interpretar la acción en la orden enviada.' });
    });
  });

  groqReq.on('error', () => {
    const localPatch = parsearOrdenLocal(prompt);
    if (localPatch.length > 0) return aplicarParche(localPatch);
    return res.status(500).json({ error: 'Error de red con Groq y fallback local no concluyente.' });
  });

  groqReq.write(payload);
  groqReq.end();
});

const PORT = 3001;
app.listen(PORT, () => console.log(`[+] Servidor V34 con Compilador Semantico activo en http://localhost:${PORT}`));
