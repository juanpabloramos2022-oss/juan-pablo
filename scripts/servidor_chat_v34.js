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
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// VECTOR 2: SEMÁFORO DE BLOQUEO / MUTEX PARA CONCURRENCIA DE ESCRITURA
// ============================================================================
let writeQueue = Promise.resolve();

const queueWriteMiddleware = (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  const currentWrite = writeQueue;
  let resolveNext;

  writeQueue = new Promise(resolve => {
    resolveNext = resolve;
  });

  currentWrite.then(() => {
    res.on('finish', resolveNext);
    res.on('close', resolveNext);
    next();
  }).catch((err) => {
    resolveNext();
    next(err);
  });
};

app.use(queueWriteMiddleware);

// ============================================================================
// RESOLUCIÓN DE API KEYS
// ============================================================================
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

// ============================================================================
// ENDPOINTS DE CONSULTA DE ESTADO
// ============================================================================
app.get('/api/status', (req, res) => {
  const hasGroq = !!getApiKey('groq');
  const hasGoogle = !!getApiKey('google');
  const hasOpenRouter = !!getApiKey('openrouter');
  const hasKeys = hasGroq || hasGoogle || hasOpenRouter;

  res.json({
    success: true,
    hasKeys,
    keys: {
      groq: hasGroq,
      google: hasGoogle,
      openrouter: hasOpenRouter
    }
  });
});

app.get('/api/script', (req, res) => {
  try {
    if (!fs.existsSync(SCRIPT_PROJECT)) {
      return res.status(404).json({ error: 'script.json no encontrado' });
    }
    const data = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo leer el script' });
  }
});

// Guardado determinista directo desde los dropdowns del Inspector
app.post('/api/save-scene', (req, res) => {
  const { id, camara, overlay, overlayText } = req.body;
  try {
    let script = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
    const scenes = script.scenes || script;
    for (let i = 0; i < scenes.length; i++) {
      if (String(scenes[i].id) === String(id)) {
        if (camara !== undefined) scenes[i].camara = camara;
        if (overlay !== undefined) scenes[i].overlay = overlay;
        if (overlayText !== undefined) scenes[i].overlayText = overlayText;
        if (!scenes[i].remotion_fx) scenes[i].remotion_fx = {};
        if (camara !== undefined) scenes[i].remotion_fx.camera_movement = camara;
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

// ============================================================================
// VECTOR 3: GESTIÓN DE TIMEOUTS (ABORTCONTROLLER)
// ============================================================================
async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Normalizador léxico
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

// ============================================================================
// PARSER LOCAL OFFLINE HEURÍSTICO MEJORADO (V36.5 HUMANIZADO)
// ============================================================================
function parsearOrdenOffline(prompt, rawScript) {
  const t = prompt.toLowerCase().trim();
  const targetId = extraerNumeroEscena(prompt) || 1; 

  // Saludos robustos
  if (/^(hola|buenas?|alo|hello|hey|hi)\b/i.test(t) || /^buen(as?|os)?\s*(d[ií]as?|tardes?|noches?)/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡SÍ, SEÑOR! ¡Excelente día, Director General! El CAO se reporta listo en el frente local offline. ¿Qué escena o parámetro visual revisamos hoy?'
    };
  }
  
  // Preguntas de estado y confirmación
  if (/c[oó]mo\s*est[aá]s|que\s*tal|qu[eé]\s*tal/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡Operando al 100% de nuestras capacidades físicas locales, mi Director General! Memoria RAM optimizada, hilos de render listos y esperando sus órdenes tácticas.'
    };
  }

  if (/me\s*lees|est[aá]s\s*ah[ií]|me\s*escuchas/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡Fuerte y claro, Director General! Conexión local estable en el puerto 3001. El CAO está en guardia permanente.'
    };
  }

  if (/qui[eé]n\s*eres/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡Soy su CAO (Chief Automation Officer), Director General! El guardián de su hardware y el cerebro de automatización de su factoría de video.'
    };
  }

  // Petición de ayuda para creación de video desde cero
  if (/crear?\s*video|nuevo?\s*video|desde\s*0|desde\s*cero|ayuda\s*a\s*crear/i.test(t)) {
    return {
      type: 'conversational',
      reply: '¡Entendido, Director General! Nota táctica de la comandancia: Actualmente operamos en MODO OFFLINE (sin conexión a APIs externas). Crear un video completamente desde cero o escribir un nuevo guion estructurado requiere de nuestros cerebros cognitivos en la nube. Le sugiero ingresar las credenciales en api_config.json para liberar todo el potencial. Mientras tanto, puedo asistirle de inmediato en ajustar el movimiento de cámara, overlays y textos de las 12 escenas actuales usando los chips y dropdowns del Inspector Visual.'
    };
  }

  // Detección de parches operativos básicos
  const patch = { id: targetId };
  let operative = false;

  if (/quitar?|borrar?|eliminar?/i.test(t) && /cartel|alerta|overlay/i.test(t)) {
    patch.overlay = "ninguno";
    patch.overlayText = "";
    operative = true;
  } else if (/anti|slideshow/i.test(t)) {
    patch.camara = "anti_slideshow";
    patch.overlay = "ninguno";
    patch.anti_slideshow = true;
    operative = true;
  } else if (/terremoto|shake|temblor/i.test(t)) {
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

  if (operative) {
    return { type: 'operative', patch: [patch] };
  }

  // Fallback conversacional genérico y camaradería sin sermones
  return {
    type: 'conversational',
    reply: '¡Entendido, Director General! Registro su observación en la bitácora local. Nota: Como operamos temporalmente sin conexión (Offline), no puedo procesar análisis semánticos complejos o redacciones libres. Le recomiendo activar las API Keys para desatar todo nuestro poder, o bien usar los controles visuales rápidos que he dispuesto a su derecha.'
  };
}

// ============================================================================
// CONEXIONES DE APIs (CEREBROS DE LA CASCADA OMNIROUTE)
// ============================================================================
async function llamarGroq(prompt, systemPrompt, key) {
  if (!key) throw new Error('Falta GROQ_API_KEY en api_config.json');
  const payload = JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  });
  const data = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: payload
  }, 4000); // 4s de timeout de hierro
  if (!data.choices || !data.choices[0]) throw new Error(data.error?.message || 'Respuesta inválida de Groq');
  return JSON.parse(data.choices[0].message.content);
}

async function llamarGemini(prompt, systemPrompt, key) {
  if (!key) throw new Error('Falta google_api_key en api_config.json');
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: `${systemPrompt}\n\nORDEN DEL USUARIO: ${prompt}` }] }],
    generationConfig: { responseMimeType: "application/json" }
  });
  const data = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  }, 5000); // 5s timeout
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content?.parts?.[0]) {
    throw new Error(data.error?.message || 'Respuesta inválida de Gemini');
  }
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

async function llamarOpenRouter(prompt, systemPrompt, key) {
  if (!key) throw new Error('Falta OPENROUTER_API_KEY en api_config.json');
  const payload = JSON.stringify({
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' }
  });
  const data = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: payload
  }, 6000); // 6s timeout
  if (!data.choices || !data.choices[0]) throw new Error(data.error?.message || 'Respuesta inválida de OpenRouter');
  return JSON.parse(data.choices[0].message.content);
}

// ============================================================================
// ENDPOINT /api/edit - ENRUTADOR COGNITIVO CON CASCADA INTELIGENTE
// ============================================================================
app.post('/api/edit', async (req, res) => {
  const { prompt, modelChoice } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt requerido' });

  let rawScript = [];
  try {
    rawScript = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo leer el script.json' });
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
    // Intento 1: Groq Cloud
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

    // Intento 2: Google AI Studio
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

    // Intento 3: OpenRouter Free
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

    // Aplicar parches si es de tipo operativo
    const patchArray = result.escenas_modificadas || result.patch;
    if (result.type === 'operative' && patchArray && patchArray.length > 0) {
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
              scenes[i].camara = 'anti_slideshow';
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

// ============================================================================
// VECTOR 4: PUENTE DE IMÁGENES NATIVO SSE (PREVENCIÓN DE FUGAS DE MEMORIA)
// ============================================================================
app.post('/api/generate-assets', async (req, res) => {
  const googleKey = getApiKey('google');
  if (!googleKey) return res.status(400).json({ error: 'Falta google_api_key o gemini_api_key en api_config.json' });

  let rawScript = [];
  try {
    rawScript = JSON.parse(fs.readFileSync(SCRIPT_PROJECT, 'utf-8'));
  } catch (e) {
    return res.status(500).json({ error: 'No se pudo leer script.json' });
  }

  // Establecer conexión SSE (Server-Sent Events)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  let connectionOpen = true;

  const enviarProgreso = (msg) => {
    if (connectionOpen) {
      res.write(`data: ${JSON.stringify(msg)}\n\n`);
    }
  };

  // Escuchar evento de desconexión del cliente para liberar RAM al instante
  req.on('close', () => {
    console.log('[SSE] Cliente desconectado. Cancelando proceso de generación y liberando RAM...');
    connectionOpen = false;
    res.end();
  });

  const scenes = rawScript.scenes || rawScript;

  try {
    for (let i = 0; i < scenes.length; i++) {
      if (!connectionOpen) break;

      const scene = scenes[i];
      const sceneId = scene.id;
      const promptTexto = scene.visual_prompt || `Vertical 9:16 cinematic scene about ${scene.text}`;

      enviarProgreso({ status: `Generando imagen para Escena ${sceneId}...`, progress: i + 1, total: scenes.length });

      // Llamada REST Imagen 3.0 API
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
                reject(new Error(parsed.error ? parsed.error.message : 'Respuesta incompleta de Imagen API'));
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

      if (!connectionOpen) break;

      // Recorte en zona segura de TikTok si existe pre-render.js
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
    }

    if (connectionOpen) {
      enviarProgreso({ status: '¡FINALIZADO! Pipeline de assets visuales ejecutado al 100%.', done: true });
      res.end();
    }
  } catch (err) {
    if (connectionOpen) {
      enviarProgreso({ status: `Fallo catastrófico en pipeline: ${err.message}`, done: true, error: true });
      res.end();
    }
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`[+] Servidor V36.5 de Estabilidad Absoluta en puerto ${PORT}`));
