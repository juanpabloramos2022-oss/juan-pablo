/**
 * guardian_integridad_av.js - Guardián de Integridad Audiovisual Pre-Render (Factoría V33.8)
 * Valida amplitud acústica con FFmpeg (mean_volume > -70dB) y coherencia secuencial de subtítulos.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AUDIO_PATH = path.resolve('C:/tiktok/projects/actual/audio_narracion.mp3');
const TIMECODES_PATH = path.resolve('C:/tiktok/projects/actual/timecodes.json');
const FFMPEG_PATH = path.resolve('C:/tiktok/ffmpeg.exe');

function validarAudio() {
    console.log('[GUARDIÁN AV] Inspeccionando amplitud acústica de audio_narracion.mp3...');
    if (!fs.existsSync(AUDIO_PATH)) {
        console.error(`[GUARDIÁN AV] ERROR: No se encontró el archivo de audio: ${AUDIO_PATH}`);
        process.exit(1);
    }

    const { spawnSync } = require('child_process');
    const res = spawnSync(FFMPEG_PATH, ['-i', AUDIO_PATH, '-af', 'volumedetect', '-f', 'null', '-']);
    const output = (res.stderr ? res.stderr.toString() : '') + (res.stdout ? res.stdout.toString() : '');
    const match = output.match(/mean_volume:\s*(-?[\d.]+)\s*dB/i);
    const maxMatch = output.match(/max_volume:\s*(-?[\d.]+)\s*dB/i);

    if (!match) {
        console.error('[GUARDIÁN AV] ERROR: No se pudo leer la amplitud acústica del audio.');
        console.error(output);
        process.exit(1);
    }

    const meanVol = parseFloat(match[1]);
    const maxVol = maxMatch ? parseFloat(maxMatch[1]) : 0.0;
    console.log(`[GUARDIÁN AV] Amplitud acústica detectada: Media=${meanVol} dB, Pico=${maxVol} dB`);

    if (meanVol <= -70.0) {
        console.error(`[GUARDIÁN AV] RECHAZADO: Audio mudo o prácticamente inaudible (${meanVol} dB <= -70dB).`);
        process.exit(1);
    }
}

function validarTimecodes() {
    console.log('[GUARDIÁN AV] Verificando integridad secuencial de timecodes.json...');
    if (!fs.existsSync(TIMECODES_PATH)) {
        console.error(`[GUARDIÁN AV] ERROR: No existe el archivo de timecodes: ${TIMECODES_PATH}`);
        process.exit(1);
    }

    const raw = fs.readFileSync(TIMECODES_PATH, 'utf-8');
    let timecodes;
    try {
        timecodes = JSON.parse(raw);
    } catch (err) {
        console.error('[GUARDIÁN AV] ERROR: timecodes.json no es un JSON válido:', err.message);
        process.exit(1);
    }

    if (!Array.isArray(timecodes) || timecodes.length === 0) {
        console.error('[GUARDIÁN AV] ERROR: timecodes.json está vacío o no es un arreglo.');
        process.exit(1);
    }

    for (let i = 0; i < timecodes.length; i++) {
        const tc = timecodes[i];
        if (typeof tc.start !== 'number' || typeof tc.end !== 'number') {
            console.error(`[GUARDIÁN AV] ERROR: Timecode #${i} inválido (start o end no son números):`, tc);
            process.exit(1);
        }

        if (tc.start < 0 || tc.end <= tc.start) {
            console.error(`[GUARDIÁN AV] ERROR: Rango de tiempo inválido en palabra "${tc.word}": start=${tc.start}, end=${tc.end}`);
            process.exit(1);
        }

        // Verificación secuencial (no se puede retroceder en el tiempo)
        if (i > 0) {
            const prev = timecodes[i - 1];
            if (tc.start < prev.start) {
                console.error(`[GUARDIÁN AV] ERROR: Solapamiento negativo detectado entre #${i - 1} ("${prev.word}") y #${i} ("${tc.word}").`);
                process.exit(1);
            }
        }
    }

    console.log(`[GUARDIÁN AV] ${timecodes.length} timecodes verificados secuencialmente sin solapamientos.`);
}

function run() {
    validarAudio();
    validarTimecodes();
    console.log('[GUARDIÁN AV] LUZ VERDE AUDIOVISUAL PARA REMOTION.');
    process.exit(0);
}

run();
