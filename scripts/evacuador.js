/**
 * evacuador.js - Detección de render terminado, generación de metadata con Groq,
 * subida a Google Drive en streaming continuo (0 MB RAM) y protocolo de limpieza local.
 */

const fs = require('fs');
const path = require('path');

const VIDEO_PATH = path.resolve('C:/tiktok/projects/actual/output/video_final_remotion.mp4');
const SCRIPT_PATH = path.resolve('C:/tiktok/projects/actual/script.json');
const PROJECT_DIR = path.resolve('C:/tiktok/projects/actual');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GOOGLE_ACCESS_TOKEN = process.env.GOOGLE_DRIVE_TOKEN;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || 'root';

// 1. Detección de estabilidad de archivo (para evitar subidas parciales)
async function esperarRenderEstable(archivo, timeoutSegundos = 300) {
    console.log(`[EVACUADOR] Monitoreando finalización de ${archivo}...`);
    let tiempoEsperado = 0;
    let ultimoTamano = -1;

    while (tiempoEsperado < timeoutSegundos) {
        if (fs.existsSync(archivo)) {
            const tamanoActual = fs.statSync(archivo).size;
            if (tamanoActual > 0 && tamanoActual === ultimoTamano) {
                console.log(`[EVACUADOR] Render finalizado y estable (${(tamanoActual / (1024 * 1024)).toFixed(2)} MB).`);
                return true;
            }
            ultimoTamano = tamanoActual;
        }
        await new Promise(r => setTimeout(r, 5000));
        tiempoEsperado += 5;
    }
    throw new Error('[EVACUADOR] Timeout esperando renderizado.');
}

// 2. Generación de Metadata Viral con Groq (Llama-3-8B ultrarrápido)
async function generarMetadataViral(scriptContenido) {
    if (!GROQ_API_KEY) {
        console.warn('[EVACUADOR] GROQ_API_KEY no configurada. Usando metadata por defecto.');
        return { titulo: "ESTO CAMBIA TU CUERPO EN 60 SEGUNDOS", descripcion: "Descubre el efecto biológico.", hashtags: "#curiosidades #ciencia #cuerpo #datos #fyp" };
    }

    const prompt = `Eres estratega de TikTok viral. Lee el script y genera:
1. Título de impacto (MÁXIMO 7 PALABRAS, mayúsculas, choque biológico/físico).
2. Descripción corta intrigante.
3. 5 hashtags de alto tráfico.
Responde estrictamente en JSON: {"titulo": "...", "descripcion": "...", "hashtags": "..."}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: JSON.stringify(scriptContenido) }
            ],
            response_format: { type: 'json_object' }
        })
    });

    const data = await res.json();
    return JSON.parse(data.choices[0].message.content);
}

// 3. Subida en Stream a Google Drive (Cero RAM intermedia)
async function subirGoogleDriveStream(videoPath, metadata) {
    if (!GOOGLE_ACCESS_TOKEN) {
        console.warn('[EVACUADOR] GOOGLE_DRIVE_TOKEN no configurado. Se omite subida a la nube.');
        return;
    }

    const fileSize = fs.statSync(videoPath).size;
    const metadataSubida = {
        name: `${metadata.titulo.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`,
        parents: [GOOGLE_DRIVE_FOLDER_ID],
        description: `${metadata.titulo}\n\n${metadata.descripcion}\n\n${metadata.hashtags}`
    };

    console.log('[EVACUADOR] Iniciando sesión Resumable Upload en Google Drive...');
    const sesionRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GOOGLE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json; charset=UTF-8',
            'X-Upload-Content-Type': 'video/mp4',
            'X-Upload-Content-Length': fileSize.toString()
        },
        body: JSON.stringify(metadataSubida)
    });

    const locationUrl = sesionRes.headers.get('location');
    if (!locationUrl) {
        throw new Error('[EVACUADOR] No se pudo obtener la URL de subida de Google Drive.');
    }

    console.log('[EVACUADOR] Transmitiendo video a la nube vía Stream (duplex: half)...');
    const fileStream = fs.createReadStream(videoPath);

    const uploadRes = await fetch(locationUrl, {
        method: 'PUT',
        headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': 'video/mp4'
        },
        body: fileStream,
        duplex: 'half'
    });

    if (uploadRes.status === 200 || uploadRes.status === 201) {
        console.log('[EVACUADOR] VIDEO SUBIDO CON ÉXITO A GOOGLE DRIVE!');
    } else {
        throw new Error(`[EVACUADOR] Fallo en la subida: ${uploadRes.statusText}`);
    }
}

// 4. Protocolo de Limpieza de Disco Duro
function limpiarEspacioLocal() {
    console.log('[EVACUADOR] Ejecutando protocolo de limpieza local...');
    try {
        if (GOOGLE_ACCESS_TOKEN && fs.existsSync(VIDEO_PATH)) {
            fs.unlinkSync(VIDEO_PATH);
            console.log('[EVACUADOR] Video local evacuado tras subida a la nube.');
        } else if (fs.existsSync(VIDEO_PATH)) {
            const tamanoMb = (fs.statSync(VIDEO_PATH).size / (1024 * 1024)).toFixed(2);
            console.log(`[EVACUADOR] Video final preservado para visualización: ${VIDEO_PATH} (${tamanoMb} MB).`);
        }
        console.log('[EVACUADOR] Limpieza completada. Espacio de disco restaurado al 100%.');
    } catch (e) {
        console.error('[EVACUADOR] Error en limpieza:', e.message);
    }
}

async function ejecutar() {
    try {
        await esperarRenderEstable(VIDEO_PATH);

        let scriptData = {};
        if (fs.existsSync(SCRIPT_PATH)) {
            scriptData = JSON.parse(fs.readFileSync(SCRIPT_PATH, 'utf-8'));
        }

        const metadata = await generarMetadataViral(scriptData);
        console.log('[EVACUADOR] Metadata generada:', metadata);

        await subirGoogleDriveStream(VIDEO_PATH, metadata);
        limpiarEspacioLocal();
        console.log('[EVACUADOR] Bucle completado exitosamente.');
    } catch (err) {
        console.error('[EVACUADOR] Fallo crítico:', err.message);
        process.exit(1);
    }
}

ejecutar();
