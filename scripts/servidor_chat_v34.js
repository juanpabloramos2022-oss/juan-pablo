const path = require('path');
// Permitir resolver express y cors instalados en remotion/node_modules
module.paths.push(path.join(__dirname, '..', 'remotion', 'node_modules'));

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const https = require('https');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(express.json());

const SCRIPT_PROJECT = path.join('C:', 'tiktok', 'projects', 'actual', 'script.json');
const SCRIPT_PUBLIC = path.join('C:', 'tiktok', 'remotion', 'public', 'script.json');
const CONFIG_PATH = path.join('C:', 'tiktok', 'api_config.json');
const VIDEO_DIR = path.join('C:', 'tiktok', 'projects', 'actual', 'output');
const IMAGES_DIR = path.join('C:', 'tiktok', 'projects', 'actual', 'images');
const PUBLIC_IMAGES_DIR = path.join('C:', 'tiktok', 'remotion', 'public', 'images');

// Asegurar directorios
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_IMAGES_DIR)) fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });

app.use('/media', express.static(VIDEO_DIR));

// 1. RESOLUCIÓN DE API KEYS
function getApiKey(type) {
  if (type === 'groq') {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_')) return process.env.GROQ_API_KEY;
  }
  if (type === 'google') {
    if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
    if (process.env.GOOGLE_API_KEY) return process.env.GOOGLE_API_KEY;
  }
  if (type === 'openrouter') {
    if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  }
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (type === 'groq') return cfg.GROQ_API_KEY || cfg.groq_api_key || cfg.api_key || '';
      if (type === 'google') return cfg.google_api_key || cfg.gemini_api_key || cfg.api_key || '';
      if (type === 'openrouter') return cfg.OPENROUTER_API_KEY || cfg.openrouter_api_key || '';
    } catch (e) {}
  }
  return '';
}

// 2. FETCH CON TIMEOUT INCORPORADO (Cero dependencias)
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// 3. APIS DE DATOS DEL SCRIPT
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
    const scenes = script.scenes || script;
    for (let i = 0; i < scenes.length; i++) {
      if (String(scenes[i].id) === String(id)) {
        if (camara !== undefined) scenes[i].camara = camara;
        if (iluminacion !== undefined) scenes[i].iluminacion = iluminacion;
        if (overlay !== undefined) scenes[i].overlay = overlay;
        if (overlayText !== undefined) scenes[i].overlayText = overlayText;
        if (!scenes[i].remotion_fx) scenes[i].remotion_fx = {};
        if (camara !== undefined) scenes[i].remotion_fx.camera_movement = camara;
        if (iluminacion !== undefined) scenes[i].remotion_fx.lighting = iluminacion;
        if (overlay !== undefined) scenes[i].remotion_fx.overlay = overlay;
        if (overlayText !== undefined) scenes[i].remotion_fx.overlay_text = overlayText;
        if (camara === 'anti_slideshow') {
          scenes[i].anti_slideshow = true;
          scenes[i].remotion_fx.anti_slideshow = true;
        } else if (camara !== undefined) {
          scenes[i].anti_slideshow = false;
          scenes[i].remotion_fx.anti_slideshow = false;
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

// 4. NORMALIZADOR LÉXICO Y PARSER OFFLINE DETERMINISTA
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

function parsearOrdenOffline(prompt, rawScript) {
  const t = prompt.toLowerCase().trim();
  const targetId = extraerNumeroEscena(prompt) || 1;

  // Diccionario conversacional heurístico para el modo offline
  if (/^hola\b|^buen(os)?\s*(dias|días|tardes|noches)/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡SÍ, SEÑOR! ¡Le saluda el CAO en modo local! La pasarela está en guardia, lista para recibir sus órdenes tácticas sobre el video.'
    };
  }
  
  if (/cómo\s*estás|como\s*estas|qué\s*tal|que\s*tal/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡AL 100%, DIRECTOR GENERAL! Motores locales encendidos, uso de RAM controlado y listos para el combate. ¿Qué ajuste táctico aplicamos hoy?'
    };
  }

  if (/me\s*lees|estás\s*ahí|estas\s*ahi|me\s*escuchas/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡FUERTE Y CLARO, DIRECTOR GENERAL! Lo leo en tiempo real a través del puerto 3001. En guardia y esperando instrucciones.'
    };
  }

  if (/quién\s*eres|quien\s*eres|tu\s*nombre|tú\s*nombre/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡Soy el CAO (Chief Automation Officer) de su Factoría Cinematográfica, Director General! Mi misión es blindar su flujo de video y optimizar cada ciclo de hardware.'
    };
  }

  // Detección de parches operativos básicos
  const patch = { id: targetId };
  let operative = false;

  if (/quitar?|borrar?|eliminar?/i.test(t) && /cartel|alerta|overlay|texto|letrero/i.test(t)) {
    patch.overlay = "ninguno";
    patch.overlayText = "";
    operative = true;
  } else if (/anti|slideshow/i.test(t)) {
    patch.camara = "anti_slideshow";
    patch.anti_slideshow = true;
    patch.overlay = "ninguno";
    operative = true;
  } else if (/terremoto|shake|temblor|sacud/i.test(t)) {
    patch.camara = "earthquake_shake";
    operative = true;
  } else if (/v[eé]rtigo|dolly/i.test(t)) {
    patch.camara = "vertigo_dolly_zoom";
    operative = true;
  } else if (/zoom\s*(violento|fuerte|r[aá]pido|in)|crash/i.test(t)) {
    patch.camara = "crash_zoom_in";
    operative = true;
  } else if (/lento|lenta|creep|crawl/i.test(t)) {
    patch.camara = "slow_creepy_crawl";
    operative = true;
  } else if (/l[aá]tigo|whip|barrido/i.test(t)) {
    patch.camara = "whip_pan_left";
    operative = true;
  } else if (/quieto|est[aá]tico|fijo/i.test(t)) {
    patch.camara = "estatico";
    operative = true;
  }

  // Iluminación
  if (/quitar?\s*(luz|iluminaci[oó]n|efectos)|luz\s*normal|limpio/i.test(t)) {
    patch.iluminacion = "limpio";
    operative = true;
  } else if (/pulso\s*rojo|alarma/i.test(t)) {
    patch.iluminacion = "red_alert_pulse";
    operative = true;
  } else if (/oscuro|suspenso|viñeta\s*oscura/i.test(t)) {
    patch.iluminacion = "dark_vignette_pulse";
    operative = true;
  } else if (/glitch|aberraci[oó]n/i.test(t)) {
    patch.iluminacion = "chromatic_aberration_glitch";
    operative = true;
  }

  if (operative) {
    return { type: 'operative', patch: [patch] };
  }

  // Respuesta por defecto si no es comando ni saludo conocido, pero manteniendo el personaje
  return {
    type: 'conversational',
    reply: '¡Entendido, Director General! Nota de combate: Actualmente opero en Modo Offline (sin conexión a APIs externas). Para que pueda conversar libremente de cualquier tema o analizar a fondo el guion, recuerde ingresar las credenciales en api_config.json. Mientras tanto, puede usar los botones visuales del Inspector o pedir parches rápidos como "quitar cartel".'
  };
}

// 5. ENRUTADORES COGNITIVOS INDEPENDIENTES
async function llamarGroq(prompt, systemPrompt, key) {
  if (!key) throw new Error('Falta GROQ_API_KEY en api_config.json');
  const payload = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });
  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: payload
  }, 4500); // 4.5s timeout
  const data = await res.json();
  if (!data.choices || !data.choices[0]) throw new Error(data.error?.message || 'Respuesta inválida de Groq');
  return JSON.parse(data.choices[0].message.content);
}

async function llamarGemini(prompt, systemPrompt, key) {
  if (!key) throw new Error('Falta google_api_key en api_config.json');
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: `${systemPrompt}\n\nORDEN DEL USUARIO: ${prompt}` }] }],
    generationConfig: { responseMimeType: "application/json" }
  });
  const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  }, 5000); // 5s timeout
  const data = await res.json();
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content?.parts?.[0]) {
    throw new Error(data.error?.message || 'Respuesta inválida de Gemini');
  }
  const textContent = data.candidates[0].content.parts[0].text;
  return JSON.parse(textContent);
}

async function llamarOpenRouter(prompt, systemPrompt, key) {
  if (!key) throw new Error('Falta OPENROUTER_API_KEY en api_config.json');
  const payload = JSON.stringify({
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });
  const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: payload
  }, 6000); // 6s timeout
  const data = await res.json();
  if (!data.choices || !data.choices[0]) throw new Error(data.error?.message || 'Respuesta inválida de OpenRouter');
  return JSON.parse(data.choices[0].message.content);
}

// 6. ENDPOINT /api/edit INTEGRADO CON CASCADA INTELIGENTE
app.post('/api/edit', async (req, res) => {
  const { prompt, modelChoice } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  let rawScript = [];
  try {
    rawScript = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo leer el script' });
  }

  const systemPrompt = `
Eres el CAO (Chief Automation Officer) de un sistema de videos TikTok vertical 9:16. Tu tono es enérgico, estratégico y militar ("¡SÍ, SEÑOR!", "Director General").
Analiza la orden del usuario y decide si es CONVERSACIONAL o si es OPERATIVA (edición del video).
Devuelve estrictamente un JSON con este esquema:
{
  "type": "conversational" | "operative",
  "reply": "Tu respuesta como CAO (solo si es conversational)",
  "escenas_modificadas": [ (solo si es operative)
    {"id": X, "camara": "...", "iluminacion": "...", "overlay": "...", "overlayText": "..."}
  ]
}
REGLAS DE EDICIÓN:
- Mapea palabras ordinales/cardinales ("uno", "primera") a ID numérico entero.
- Si pide "quitar cartel", "borrar alerta" -> overlay: "ninguno", overlayText: "".
- Cámaras: crash_zoom_in, vertigo_dolly_zoom, slow_creepy_crawl, whip_pan_left, earthquake_shake, estatico, anti_slideshow.
- Iluminación: red_alert_pulse, dark_vignette_pulse, chromatic_aberration_glitch, limpio.
- Overlays: alerta_roja_neon, marco_cinematico, ninguno.
`;

  const groqKey = getApiKey('groq');
  const googleKey = getApiKey('google');
  const openRouterKey = getApiKey('openrouter');

  let result = null;
  let brainUsed = '';

  const activeMode = modelChoice || 'auto';

  try {
    if (activeMode === 'groq' || (activeMode === 'auto' && groqKey)) {
      try {
        console.log('[Mini-OmniRoute] Intentando canal Groq Cloud...');
        result = await llamarGroq(prompt, systemPrompt, groqKey);
        brainUsed = 'Groq Llama 3.3';
      } catch (err) {
        console.warn(`[!] Canal Groq falló: ${err.message}`);
        if (activeMode === 'groq') throw err;
      }
    }

    if (!result && (activeMode === 'gemini' || (activeMode === 'auto' && googleKey))) {
      try {
        console.log('[Mini-OmniRoute] Intentando canal Google AI Studio...');
        result = await llamarGemini(prompt, systemPrompt, googleKey);
        brainUsed = 'Gemini 2.0 Flash';
      } catch (err) {
        console.warn(`[!] Canal Google AI Studio falló: ${err.message}`);
        if (activeMode === 'gemini') throw err;
      }
    }

    if (!result && (activeMode === 'openrouter' || (activeMode === 'auto' && openRouterKey))) {
      try {
        console.log('[Mini-OmniRoute] Intentando canal OpenRouter Free...');
        result = await llamarOpenRouter(prompt, systemPrompt, openRouterKey);
        brainUsed = 'OpenRouter Free Llama';
      } catch (err) {
        console.warn(`[!] Canal OpenRouter falló: ${err.message}`);
        if (activeMode === 'openrouter') throw err;
      }
    }

    // Fallback absoluto: Procesamiento Offline Local
    if (!result) {
      console.log('[Mini-OmniRoute] Conmutando a Motor de Fallback Offline...');
      result = parsearOrdenOffline(prompt, rawScript);
      brainUsed = 'Modo Offline (Solo Local)';
    }

    // Aplicar parches si la respuesta es de tipo operativa
    if (result.type === 'operative' && (result.escenas_modificadas || result.patch)) {
      const patchArray = result.escenas_modificadas || result.patch;
      let script = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
      const scenes = script.scenes || script;
      for (const cambio of patchArray) {
        for (let i = 0; i < scenes.length; i++) {
          if (String(scenes[i].id) === String(cambio.id)) {
            Object.assign(scenes[i], cambio);
            if (!scenes[i].remotion_fx) scenes[i].remotion_fx = {};
            if (cambio.camara) scenes[i].remotion_fx.camera_movement = cambio.camara;
            if (cambio.iluminacion) scenes[i].remotion_fx.lighting = cambio.iluminacion;
            if (cambio.overlay) scenes[i].remotion_fx.overlay = cambio.overlay;
            if (cambio.overlayText !== undefined) scenes[i].remotion_fx.overlay_text = cambio.overlayText;
            if (cambio.camara === 'anti_slideshow') {
              scenes[i].anti_slideshow = true;
              scenes[i].remotion_fx.anti_slideshow = true;
            }
          }
        }
      }
      fs.writeFileSync(SCRIPT_PROJECT, JSON.stringify(script, null, 2), 'utf-8');
      fs.writeFileSync(SCRIPT_PUBLIC, JSON.stringify(script, null, 2), 'utf-8');
      return res.json({ success: true, type: 'operative', patch: patchArray, cerebro: brainUsed });
    }

    return res.json({ success: true, type: 'conversational', reply: result.reply, cerebro: brainUsed });

  } catch (fatalError) {
    console.error('[Mini-OmniRoute] Error crítico:', fatalError.message);
    const localResult = parsearOrdenOffline(prompt, rawScript);
    return res.json({ success: true, type: localResult.type, reply: localResult.reply, patch: localResult.patch, cerebro: 'Fallback Emergencia Local' });
  }
});

// 7. PUENTE DE GENERACIÓN VISUAL EN PILOTO AUTOMÁTICO (IMAGEN 3.0 API)
app.post('/api/generate-assets', async (req, res) => {
  const googleKey = getApiKey('google');
  if (!googleKey) return res.status(400).json({ error: 'Falta google_api_key o gemini_api_key en api_config.json' });

  let rawScript = [];
  try {
    rawScript = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo leer script.json' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const enviarProgreso = (msg) => {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  };

  const scenes = rawScript.scenes || rawScript;

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const sceneId = scene.id;
    const promptTexto = scene.visual_prompt || `Vertical 9:16 cinematic scene about ${scene.text}`;

    enviarProgreso({ status: `Generando imagen para Escena ${sceneId}...`, progress: i + 1, total: scenes.length });

    try {
      const postData = JSON.stringify({
        requests: [{
          prompt: { text: promptTexto },
          aspectRatio: "9:16",
          numberOfImages: 1
        }]
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/imagen-3.0-generate-002:generateImages?key=${googleKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      await new Promise((resolve, reject) => {
        const reqImage = https.request(options, (resImg) => {
          let chunkData = '';
          resImg.on('data', (d) => chunkData += d);
          resImg.on('end', () => {
            try {
              const parsed = JSON.parse(chunkData);
              if (parsed.generatedImages && parsed.generatedImages[0]) {
                const base64Image = parsed.generatedImages[0].image.imageBytes;
                const buffer = Buffer.from(base64Image, 'base64');
                const outPath = path.join(IMAGES_DIR, `escena_${sceneId}.png`);
                const publicOutPath = path.join(PUBLIC_IMAGES_DIR, `escena_${sceneId}.png`);
                fs.writeFileSync(outPath, buffer);
                fs.writeFileSync(publicOutPath, buffer);
                resolve();
              } else {
                reject(new Error(parsed.error ? parsed.error.message : 'Error de respuesta Imagen API'));
              }
            } catch (e) {
              reject(e);
            }
          });
        });
        reqImage.on('error', reject);
        reqImage.write(postData);
        reqImage.end();
      });

      // Recorte en zona segura de TikTok mediante pre-render.js si existe
      enviarProgreso({ status: `Recortando zona segura Escena ${sceneId}...`, progress: i + 1, total: scenes.length });
      await new Promise((resolve) => {
        const preRenderPath = path.join('C:', 'tiktok', 'remotion', 'pre-render.js');
        if (fs.existsSync(preRenderPath)) {
          const imagePath = path.join(IMAGES_DIR, `escena_${sceneId}.png`);
          exec(`node "${preRenderPath}" "${imagePath}"`, () => resolve());
        } else {
          resolve();
        }
      });

      enviarProgreso({ status: `¡Escena ${sceneId} completada!`, progress: i + 1, total: scenes.length });
    } catch (err) {
      enviarProgreso({ status: `Fallo en Escena ${sceneId}: ${err.message}. Saltando...`, progress: i + 1, total: scenes.length });
    }
  }

  enviarProgreso({ status: '¡FINALIZADO! Pipeline de assets visuales ejecutado al 100%.', done: true });
  res.end();
});

// 8. SERVIR INTERFAZ WEB V36.2
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Estudio de Producción V36.2: Mini-OmniRoute</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { display: flex; width: 100vw; height: 100vh; background-color: #0c0d12; color: #fff; overflow: hidden; }
    .player-section { flex: 1.1; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; background: #08090d; position: relative; }
    .video-card { height: 82vh; aspect-ratio: 9/16; background: #000; border-radius: 16px; overflow: hidden; box-shadow: 0 0 40px rgba(0,0,0,0.85); border: 2px solid #1f2230; }
    video { width: 100%; height: 100%; object-fit: cover; }
    
    .sidebar { width: 480px; border-left: 1px solid #1f2230; display: flex; flex-direction: column; background: #13151f; }
    .tabs { display: flex; border-bottom: 1px solid #1f2230; background: #181b28; }
    .tab { flex: 1; padding: 15px; text-align: center; cursor: pointer; font-weight: bold; font-size: 13px; color: #8d94a5; text-transform: uppercase; transition: 0.2s; user-select: none; }
    .tab.active { color: #FFE500; border-bottom: 2px solid #FFE500; background: #13151f; }
    
    .panel-content { flex: 1; overflow-y: auto; padding: 20px; display: none; }
    .panel-content.active { display: block; }
    
    .scene-card { background: #1c1e2d; border-radius: 8px; border: 1px solid #2d314a; margin-bottom: 12px; padding: 14px; }
    .scene-header { font-size: 14px; font-weight: 900; color: #00F0FF; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .save-badge { background: #FF0055; color: #fff; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; text-transform: uppercase; }
    .save-badge:hover { background: #d90048; }
    .scene-text { font-size: 12px; color: #a5adc4; margin-bottom: 10px; font-style: italic; }
    .field-group { margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .field-group label { font-size: 11px; color: #8d94a5; text-transform: uppercase; width: 95px; flex-shrink: 0; }
    .field-group select, .field-group input { flex: 1; background: #0c0d12; color: #fff; border: 1px solid #2d314a; padding: 6px 8px; border-radius: 4px; font-size: 12px; outline: none; }
    .field-group select:focus, .field-group input:focus { border-color: #FF0055; }
    
    .log-box { height: calc(100vh - 310px); background: #090a0f; border-radius: 10px; padding: 16px; border: 1px solid #1f2230; overflow-y: auto; margin-bottom: 16px; font-size: 13px; line-height: 1.5; }
    .msg { margin-bottom: 12px; padding: 8px 12px; border-radius: 6px; }
    .msg-sys { background: rgba(0, 240, 255, 0.1); color: #00F0FF; border: 1px solid rgba(0, 240, 255, 0.2); }
    .msg-user { background: rgba(255, 229, 0, 0.1); color: #FFE500; border: 1px solid rgba(229, 229, 0, 0.2); }
    .msg-ok { background: rgba(0, 255, 102, 0.1); color: #00FF66; border: 1px solid rgba(0, 255, 102, 0.2); }
    .msg-cao { background: rgba(255, 0, 85, 0.1); color: #FF0055; border: 1px solid rgba(255, 0, 85, 0.2); font-weight: 500; }
    .brain-badge { display: inline-block; margin-top: 5px; font-size: 10px; background: rgba(0, 240, 255, 0.15); color: #00F0FF; padding: 2px 6px; border-radius: 10px; font-weight: bold; }
    
    textarea { width: 100%; height: 75px; background: #090a0f; color: #fff; border: 1px solid #2a2e42; border-radius: 8px; padding: 10px; font-size: 13px; resize: none; margin-bottom: 12px; outline: none; }
    textarea:focus { border-color: #FF0055; }
    .action-btn { width: 100%; padding: 14px; background: #FF0055; color: #fff; font-weight: 900; border: none; border-radius: 8px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: 0.2s; }
    .action-btn:hover { background: #d90048; }

    .progress-bar-container { width: 100%; height: 16px; background-color: #1c1e2d; border-radius: 8px; overflow: hidden; margin-top: 10px; display: none; border: 1px solid #2d314a; max-width: 450px; }
    .progress-fill { height: 100%; width: 0%; background-color: #FFE500; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="player-section">
    <div class="video-card">
      <video id="videoPlayer" controls autoplay loop>
        <source src="/media/video_final_remotion.mp4" type="video/mp4">
      </video>
    </div>
    <div style="margin-top: 15px; display: flex; gap: 15px; width: 100%; max-width: 450px;">
      <button class="action-btn" style="background:#00F0FF; color:#000;" onclick="generarAssetsNativos()">Autogenerar Visuales (API Imagen)</button>
    </div>
    <div class="progress-bar-container" id="pBar">
      <div class="progress-fill" id="pFill"></div>
    </div>
    <p id="progressStatus" style="font-size:12px; color:#8d94a5; margin-top:8px;"></p>
  </div>

  <div class="sidebar">
    <div class="tabs">
      <div class="tab active" id="tab-inspector" onclick="switchTab('inspector')">Inspector</div>
      <div class="tab" id="tab-chat" onclick="switchTab('chat')">Asistente IA</div>
    </div>

    <!-- PANEL 1: INSPECTOR -->
    <div id="panel-inspector" class="panel-content active">
      <div class="field-group" style="margin-bottom: 20px; border-bottom: 1px solid #2d314a; padding-bottom: 15px;">
        <label style="color:#FFE500; font-weight:bold;">CEREBRO CORE</label>
        <select id="brain-select" style="border-color:#FFE500;">
          <option value="auto">Cascada Inteligente (Auto-Failover)</option>
          <option value="groq">Forzar: Groq Llama 3.3</option>
          <option value="gemini">Forzar: Gemini 2.0 Flash</option>
          <option value="openrouter">Forzar: OpenRouter Free Llama</option>
          <option value="offline">Forzar: Modo Offline (Solo Local)</option>
        </select>
      </div>
      <h3 style="font-size:14px; margin-bottom:12px; color:#00F0FF;">Ajustes Visuales por Escena</h3>
      <div id="inspectorContainer">Cargando escenas...</div>
    </div>

    <!-- PANEL 2: CHAT COGNITIVO -->
    <div id="panel-chat" class="panel-content">
      <div class="log-box" id="logBox">
        <div class="msg msg-sys">[SISTEMA]: Pasarela Mini-OmniRoute V36.2 activa. Conectando múltiples cerebros de IA.</div>
      </div>
      <textarea id="promptInput" placeholder="Saluda al CAO, haz preguntas sobre el video o pide ediciones directas..."></textarea>
      <button class="action-btn" id="sendBtn" onclick="enviarOrdenChat()">Enviar a IA</button>
    </div>
  </div>

  <script>
    let currentScript = [];

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
      } catch (e) {}
    }

    function renderInspector() {
      const container = document.getElementById('inspectorContainer');
      container.innerHTML = '';
      const scenes = currentScript.scenes || currentScript;
      scenes.forEach(scene => {
        const card = document.createElement('div');
        card.className = 'scene-card';
        card.innerHTML = \`
          <div class="scene-header">
            <span>Escena \${scene.id}</span>
            <span class="save-badge" onclick="guardarEscenaVisual(\${scene.id})">Guardar</span>
          </div>
          <div class="scene-text">"\${scene.text || scene.narrative_text || ''}"</div>
          
          <div class="field-group">
            <label>Cámara</label>
            <select id="cam-\${scene.id}">
              <option value="estatico" \${scene.camara === 'estatico' ? 'selected' : ''}>Plano Fijo</option>
              <option value="anti_slideshow" \${scene.anti_slideshow || scene.camara === 'anti_slideshow' ? 'selected' : ''}>Anti-Slideshow 7-Capas</option>
              <option value="crash_zoom_in" \${scene.camara === 'crash_zoom_in' ? 'selected' : ''}>Zoom Elástico</option>
              <option value="vertigo_dolly_zoom" \${scene.camara === 'vertigo_dolly_zoom' ? 'selected' : ''}>Efecto Vértigo</option>
              <option value="earthquake_shake" \${scene.camara === 'earthquake_shake' ? 'selected' : ''}>Terremoto</option>
              <option value="slow_creepy_crawl" \${scene.camara === 'slow_creepy_crawl' ? 'selected' : ''}>Zoom Lento</option>
              <option value="whip_pan_left" \${scene.camara === 'whip_pan_left' ? 'selected' : ''}>Barrido Rápido</option>
            </select>
          </div>
          <div class="field-group">
            <label>Iluminación</label>
            <select id="light-\${scene.id}">
              <option value="limpio" \${scene.iluminacion === 'limpio' ? 'selected' : ''}>Limpio / Normal</option>
              <option value="red_alert_pulse" \${scene.iluminacion === 'red_alert_pulse' ? 'selected' : ''}>Pulso Alerta Roja</option>
              <option value="chromatic_aberration_glitch" \${scene.iluminacion === 'chromatic_aberration_glitch' ? 'selected' : ''}>Glitch Óptico</option>
              <option value="dark_vignette_pulse" \${scene.iluminacion === 'dark_vignette_pulse' ? 'selected' : ''}>Viñeta Oscura</option>
            </select>
          </div>
          <div class="field-group">
            <label>Overlay</label>
            <select id="over-\${scene.id}">
              <option value="ninguno" \${scene.overlay === 'ninguno' ? 'selected' : ''}>Ninguno</option>
              <option value="alerta_roja_neon" \${scene.overlay === 'alerta_roja_neon' ? 'selected' : ''}>Letrero Neón</option>
              <option value="marco_cinematico" \${scene.overlay === 'marco_cinematico' ? 'selected' : ''}>Marco Cinemático</option>
            </select>
          </div>
          <div class="field-group">
            <label>Texto Alerta</label>
            <input type="text" id="overTxt-\${scene.id}" value="\${scene.overlayText || ''}" placeholder="Ej: ¡ALERTA!">
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
          const player = document.getElementById('videoPlayer');
          player.src = '/media/video_final_remotion.mp4?t=' + Date.now();
          player.load();
          cargarScript();
        }
      } catch (e) {}
    }

    async function enviarOrdenChat() {
      const input = document.getElementById('promptInput');
      const btn = document.getElementById('sendBtn');
      const log = document.getElementById('logBox');
      const text = input.value.trim();
      const brain = document.getElementById('brain-select').value;
      if (!text) return;

      btn.disabled = true;
      btn.innerText = 'Pensando...';
      log.innerHTML += '<div class="msg msg-user"><b>Tú:</b> ' + text + '</div>';
      log.scrollTop = log.scrollHeight;

      try {
        const res = await fetch('/api/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text, modelChoice: brain })
        });
        const data = await res.json();
        if (data.success) {
          if (data.type === 'conversational') {
            log.innerHTML += '<div class="msg msg-cao"><b>CAO:</b> ' + data.reply + '<br><span class="brain-badge">🧠 ' + (data.cerebro || 'Mini-OmniRoute') + '</span></div>';
          } else {
            log.innerHTML += '<div class="msg msg-ok"><b>[OK]:</b> Edición aplicada en script.json. Refrescando visualizador...<br><span class="brain-badge">🧠 ' + (data.cerebro || 'Mini-OmniRoute') + '</span></div>';
            const player = document.getElementById('videoPlayer');
            player.src = '/media/video_final_remotion.mp4?t=' + Date.now();
            player.load();
            cargarScript();
          }
        } else {
          log.innerHTML += '<div class="msg" style="color:#FF0055"><b>[ERROR]:</b> ' + (data.error || 'Error interno') + '</div>';
        }
      } catch (e) {
        log.innerHTML += '<div class="msg" style="color:#FF0055"><b>[ERROR]:</b> Error de conexión.</div>';
      }

      input.value = '';
      btn.disabled = false;
      btn.innerText = 'Enviar a IA';
      log.scrollTop = log.scrollHeight;
    }

    async function generarAssetsNativos() {
      const pBar = document.getElementById('pBar');
      const pFill = document.getElementById('pFill');
      const status = document.getElementById('progressStatus');
      
      pBar.style.display = 'block';
      pFill.style.width = '0%';
      status.innerText = 'Inicializando conexión con Google AI Studio...';

      try {
        const response = await fetch('/api/generate-assets', { method: 'POST' });
        if (!response.ok) {
          const err = await response.json();
          status.innerText = 'Error: ' + (err.error || 'Fallo de conexión');
          return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\\n\\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.replace('data: ', ''));
              status.innerText = data.status;
              if (data.progress) {
                const pct = (data.progress / data.total) * 100;
                pFill.style.width = pct + '%';
              }
              if (data.done) {
                const player = document.getElementById('videoPlayer');
                player.src = '/media/video_final_remotion.mp4?t=' + Date.now();
                player.load();
              }
            }
          }
        }
      } catch (e) {
        status.innerText = 'Error durante la generación: ' + e.message;
      }
    }

    cargarScript();
  </script>
</body>
</html>
  `;
  res.send(html);
});

const PORT = 3001;
app.listen(PORT, () => console.log(`[+] Servidor V36.2 Híbrido y Cascada activo en puerto ${PORT}`));
