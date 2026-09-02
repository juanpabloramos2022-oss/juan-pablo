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

// Normalizador de palabras a números (1-12)
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

// Parser Semántico Local Robusto
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

  // Cámaras
  if (/anti|slideshow/i.test(t)) {
    patch.camara = "anti_slideshow";
    patch.anti_slideshow = true;
    modificado = true;
  } else if (/terremoto|temblor|sacud/i.test(t)) {
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

// APIs de Sincronización de Datos
app.get('/api/script', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer el script' });
  }
});

app.post('/api/save-scene', (req, res) => {
  const { id, camara, iluminacion, overlay, overlayText } = req.body;
  try {
    let script = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
    for (let i = 0; i < script.length; i++) {
      if (String(script[i].id) === String(id)) {
        script[i].camara = camara;
        script[i].iluminacion = iluminacion;
        script[i].overlay = overlay;
        script[i].overlayText = overlayText || "";
        if (!script[i].remotion_fx) script[i].remotion_fx = {};
        script[i].remotion_fx.camera_movement = camara;
        script[i].remotion_fx.lighting = iluminacion;
        script[i].remotion_fx.overlay = overlay;
        script[i].remotion_fx.overlay_text = overlayText || "";
        if (camara === "anti_slideshow") {
          script[i].anti_slideshow = true;
          script[i].remotion_fx.anti_slideshow = true;
        } else {
          script[i].anti_slideshow = false;
          script[i].remotion_fx.anti_slideshow = false;
        }
      }
    }
    fs.writeFileSync(SCRIPT_PROJECT, JSON.stringify(script, null, 2), 'utf-8');
    fs.writeFileSync(SCRIPT_PUBLIC, JSON.stringify(script, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Fallo al guardar escena' });
  }
});

// Interfaz Web V35 de Control Completo
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Estudio de Producción V35</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { display: flex; width: 100vw; height: 100vh; background-color: #0c0d12; color: #fff; overflow: hidden; }
    .player-section { flex: 1.2; display: flex; justify-content: center; align-items: center; padding: 20px; background: #08090d; position: relative; }
    .video-card { height: 92vh; aspect-ratio: 9/16; background: #000; border-radius: 16px; overflow: hidden; box-shadow: 0 0 40px rgba(0,0,0,0.85); border: 2px solid #1f2230; }
    video { width: 100%; height: 100%; object-fit: cover; }
    
    .sidebar { width: 480px; border-left: 1px solid #1f2230; display: flex; flex-direction: column; background: #13151f; }
    .tabs { display: flex; border-bottom: 1px solid #1f2230; background: #181b28; }
    .tab { flex: 1; padding: 15px; text-align: center; cursor: pointer; font-weight: bold; font-size: 13px; color: #8d94a5; text-transform: uppercase; transition: 0.2s; user-select: none; }
    .tab.active { color: #FFE500; border-bottom: 2px solid #FFE500; background: #13151f; }
    
    .panel-content { flex: 1; overflow-y: auto; padding: 20px; display: none; }
    .panel-content.active { display: block; }
    
    /* Estilos del Inspector Visual */
    .scene-card { background: #1c1e2d; border-radius: 8px; border: 1px solid #2d314a; margin-bottom: 12px; padding: 14px; transition: border-color 0.2s; }
    .scene-card:hover { border-color: #3f4568; }
    .scene-header { font-size: 14px; font-weight: 900; color: #00F0FF; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .save-badge { background: #FF0055; color: #fff; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase; transition: 0.2s; }
    .save-badge:hover { background: #d90048; }
    .scene-text { font-size: 12px; color: #a5adc4; margin-bottom: 10px; font-style: italic; line-height: 1.4; }
    .field-group { margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .field-group label { font-size: 11px; color: #8d94a5; text-transform: uppercase; width: 95px; flex-shrink: 0; }
    .field-group select, .field-group input { flex: 1; background: #0c0d12; color: #fff; border: 1px solid #2d314a; padding: 6px 8px; border-radius: 4px; font-size: 12px; outline: none; }
    .field-group select:focus, .field-group input:focus { border-color: #FF0055; }
    
    /* Estilos del Chat */
    .log-box { height: calc(100vh - 250px); background: #090a0f; border-radius: 10px; padding: 16px; border: 1px solid #1f2230; overflow-y: auto; margin-bottom: 16px; font-size: 13px; line-height: 1.5; }
    .msg { margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; }
    .msg-sys { background: rgba(0, 240, 255, 0.1); color: #00F0FF; border: 1px solid rgba(0, 240, 255, 0.2); }
    .msg-user { background: rgba(255, 229, 0, 0.1); color: #FFE500; border: 1px solid rgba(229, 229, 0, 0.2); }
    .msg-ok { background: rgba(0, 255, 102, 0.1); color: #00FF66; border: 1px solid rgba(0, 255, 102, 0.2); }
    textarea { width: 100%; height: 80px; background: #090a0f; color: #fff; border: 1px solid #2a2e42; border-radius: 8px; padding: 12px; font-size: 13px; resize: none; margin-bottom: 12px; outline: none; }
    textarea:focus { border-color: #FF0055; }
    .action-btn { width: 100%; padding: 14px; background: #FF0055; color: #fff; font-weight: 900; border: none; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; }
    .action-btn:hover { background: #d90048; }
    .action-btn:disabled { background: #555; cursor: not-allowed; }
    .toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #00FF66; color: #000; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 13px; display: none; z-index: 999; box-shadow: 0 4px 15px rgba(0,255,102,0.4); }
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

  <div class="sidebar">
    <div class="tabs">
      <div class="tab active" id="tab-inspector" onclick="switchTab('inspector')">Inspector Visual</div>
      <div class="tab" id="tab-chat" onclick="switchTab('chat')">Asistente IA</div>
    </div>

    <!-- PANEL 1: INSPECTOR VISUAL DIRECTO -->
    <div id="panel-inspector" class="panel-content active">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="font-size:15px; color:#FFE500;">Control Quirúrgico por Escenas</h3>
        <span style="font-size:11px; color:#00F0FF; cursor:pointer;" onclick="cargarScript()">↻ Recargar</span>
      </div>
      <div id="inspectorContainer">Cargando escenas...</div>
    </div>

    <!-- PANEL 2: ASISTENTE DE CHAT -->
    <div id="panel-chat" class="panel-content">
      <div class="log-box" id="logBox">
        <div class="msg msg-sys">[SISTEMA]: Compilador Semántico V35 Activo. Conversa con el video en español coloquial.</div>
      </div>
      <textarea id="promptInput" placeholder="Ej: En la escena uno quita el cartel de arriba shock biologico..."></textarea>
      <button class="action-btn" id="sendBtn" onclick="enviarOrdenChat()">Ejecutar Orden Semántica</button>
    </div>
  </div>

  <div id="toast" class="toast">¡Cambio guardado!</div>

  <script>
    let currentScript = [];

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.innerText = msg;
      toast.style.display = 'block';
      setTimeout(() => { toast.style.display = 'none'; }, 2500);
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
      
      document.getElementById('tab-' + tabName).classList.add('active');
      document.getElementById('panel-' + tabName).classList.add('active');
    }

    async function cargarScript() {
      try {
        const res = await fetch('/api/script');
        currentScript = await res.json();
        renderInspector();
      } catch (e) {
        console.error('Error cargando el script.json', e);
        document.getElementById('inspectorContainer').innerText = 'Error al cargar script.json';
      }
    }

    function renderInspector() {
      const container = document.getElementById('inspectorContainer');
      container.innerHTML = '';
      
      currentScript.forEach(scene => {
        const card = document.createElement('div');
        card.className = 'scene-card';
        card.innerHTML = \`
          <div class="scene-header">
            <span>Escena \${scene.id} (\${scene.durationInSeconds ? scene.durationInSeconds.toFixed(1) + 's' : ''})</span>
            <span class="save-badge" onclick="guardarEscenaVisual(\${scene.id})">Guardar</span>
          </div>
          <div class="scene-text">"\${scene.text || ''}"</div>
          
          <div class="field-group">
            <label>Cámara</label>
            <select id="cam-\${scene.id}">
              <option value="estatico" \${scene.camara === 'estatico' ? 'selected' : ''}>Plano Fijo (estatico)</option>
              <option value="anti_slideshow" \${scene.anti_slideshow || scene.camara === 'anti_slideshow' ? 'selected' : ''}>7-Capas Cinemáticas (anti_slideshow)</option>
              <option value="crash_zoom_in" \${scene.camara === 'crash_zoom_in' ? 'selected' : ''}>Zoom Elástico (crash_zoom_in)</option>
              <option value="vertigo_dolly_zoom" \${scene.camara === 'vertigo_dolly_zoom' ? 'selected' : ''}>Vértigo (vertigo_dolly_zoom)</option>
              <option value="earthquake_shake" \${scene.camara === 'earthquake_shake' ? 'selected' : ''}>Terremoto (earthquake_shake)</option>
              <option value="slow_creepy_crawl" \${scene.camara === 'slow_creepy_crawl' ? 'selected' : ''}>Zoom Lento (slow_creepy_crawl)</option>
              <option value="whip_pan_left" \${scene.camara === 'whip_pan_left' ? 'selected' : ''}>Barrido Rápido (whip_pan_left)</option>
            </select>
          </div>

          <div class="field-group">
            <label>Iluminación</label>
            <select id="light-\${scene.id}">
              <option value="limpio" \${scene.iluminacion === 'limpio' ? 'selected' : ''}>Normal / Limpio</option>
              <option value="red_alert_pulse" \${scene.iluminacion === 'red_alert_pulse' ? 'selected' : ''}>Pulso de Alerta Roja</option>
              <option value="chromatic_aberration_glitch" \${scene.iluminacion === 'chromatic_aberration_glitch' ? 'selected' : ''}>Glitch Óptico</option>
              <option value="dark_vignette_pulse" \${scene.iluminacion === 'dark_vignette_pulse' ? 'selected' : ''}>Respiración Suspenso</option>
            </select>
          </div>

          <div class="field-group">
            <label>Overlay</label>
            <select id="over-\${scene.id}">
              <option value="ninguno" \${scene.overlay === 'ninguno' ? 'selected' : ''}>Ninguno</option>
              <option value="alerta_roja_neon" \${scene.overlay === 'alerta_roja_neon' ? 'selected' : ''}>Letrero Rojo Neón</option>
              <option value="marco_cinematico" \${scene.overlay === 'marco_cinematico' ? 'selected' : ''}>Viñeta de Cine Oscura</option>
            </select>
          </div>

          <div class="field-group">
            <label>Texto Alerta</label>
            <input type="text" id="overTxt-\${scene.id}" value="\${scene.overlayText || ''}" placeholder="Ej: ¡SHOCK!">
          </div>
        \`;
        container.appendChild(card);
      });
    }

    async function guardarEscenaVisual(id) {
      const camara = document.getElementById('cam-' + id).value;
      const iluminacion = document.getElementById('light-' + id).value;
      const overlay = document.getElementById('over-' + id).value;
      const overlayText = document.getElementById('overTxt-' + id).value;

      try {
        const res = await fetch('/api/save-scene', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, camara, iluminacion, overlay, overlayText })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✓ Escena ' + id + ' actualizada');
          const player = document.getElementById('videoPlayer');
          player.src = '/media/video_final_remotion.mp4?t=' + Date.now();
          player.load();
          cargarScript();
        } else {
          alert('Error al guardar: ' + (data.error || 'Error desconocido'));
        }
      } catch (e) {
        alert('Error al guardar escena.');
      }
    }

    async function enviarOrdenChat() {
      const input = document.getElementById('promptInput');
      const btn = document.getElementById('sendBtn');
      const log = document.getElementById('logBox');
      const text = input.value.trim();
      if (!text) return;

      btn.disabled = true;
      btn.innerText = 'Pensando semánticamente...';
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
          log.innerHTML += '<div class="msg msg-ok"><b>[OK]:</b> Orden ejecutada en script.json. Parche aplicado con éxito: ' + JSON.stringify(data.patch) + '</div>';
          const player = document.getElementById('videoPlayer');
          player.src = '/media/video_final_remotion.mp4?t=' + Date.now();
          player.load();
          cargarScript();
        } else {
          log.innerHTML += '<div class="msg" style="color:#FF0055"><b>[ERROR]:</b> ' + (data.error || 'Fallo desconocido') + '</div>';
        }
      } catch (e) {
        log.innerHTML += '<div class="msg" style="color:#FF0055"><b>[ERROR]:</b> Falla de red en servidor local.</div>';
      }

      input.value = '';
      btn.disabled = false;
      btn.innerText = 'Ejecutar Orden Semántica';
      log.scrollTop = log.scrollHeight;
    }

    // Inicializar
    cargarScript();
  </script>
</body>
</html>
  `;
  res.send(html);
});

// 5. ENDPOINT /api/edit HÍBRIDO CON COMPILADOR SEMÁNTICO UNIVERSAL
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
          if (cambio.camara === "anti_slideshow") {
            rawScript[i].anti_slideshow = true;
            rawScript[i].remotion_fx.anti_slideshow = true;
          }
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

  const systemPrompt = `
Eres un Asistente de Edición Cinematográfica en Remotion.
Recibe el JSON de 12 escenas y una orden coloquial.
Devuelve ÚNICAMENTE un JSON: {"escenas_modificadas": [{"id": X, "camara": "...", "iluminacion": "...", "overlay": "...", "overlayText": "..."}]}.
Reglas de mapeo semántico:
- Ordinales/cardinales ("uno", "primera") -> id: 1
- Si dice "quita el cartel", "elimina la alerta", "borra el texto de arriba" -> overlay: "ninguno", overlayText: ""
- Si dice "activa anti-slideshow", "pon anti slideshow", "activa el anti_slideshow" -> camara: "anti_slideshow", overlay: "ninguno"
- Cámaras: crash_zoom_in, vertigo_dolly_zoom, slow_creepy_crawl, whip_pan_left, earthquake_shake, estatico, anti_slideshow.
- Iluminación: red_alert_pulse, dark_vignette_pulse, chromatic_aberration_glitch, limpio.
- Overlays: alerta_roja_neon, marco_cinematico, ninguno.
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
app.listen(PORT, () => console.log(`[+] Servidor V35 Hibrido activo en http://localhost:${PORT}`));
