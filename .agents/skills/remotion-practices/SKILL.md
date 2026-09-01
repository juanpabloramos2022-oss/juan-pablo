---
name: remotion-practices
description: Directrices maestras de desarrollo y renderizado en Remotion con React/TypeScript para Factoría V33.7. Uso estricto de useCurrentFrame, useVideoConfig, animaciones elásticas con spring(), interpolaciones con interpolate(), gestión de componentes <Img>, <Audio>, <Video> y composición vertical 9:16 (1080x1920 @ 30fps) para TikTok, Reels y Shorts.
---

# Directrices de Buenas Prácticas Remotion (Factoría V33.7 AAS Core)

Guía operativa y estándar de desarrollo en React/TypeScript para la generación y renderizado programático de videos verticales cinematográficos en Remotion.

---

## 1. Especificaciones de Composición Vertical (9:16)

Todos los proyectos y composiciones destinadas a TikTok, YouTube Shorts e Instagram Reels deben adherirse estrictamente al estándar:

- **Resolución**: `1080 x 1920` píxeles (aspect ratio 9:16 vertical).
- **Framerate**: `30 fps` constantes.
- **Cálculo de cuadros**: `durationInFrames = Math.max(30, Math.round(duracionEnSegundos * fps))`.
- **Estructura Raíz**:
  ```tsx
  <Composition
    id="Root"
    component={TikTokVideo}
    durationInFrames={totalFrames}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={defaultProps}
    calculateMetadata={async ({ props, defaultProps }) => {
      // Cálculo dinámico de frames según escenas y props
      return {
        durationInFrames: totalFrames,
        props: { ...defaultProps, ...props },
      };
    }}
  />
  ```

---

## 2. Determinismo Frame a Frame (Regla Primordial)

Remotion es un motor de renderizado determinista que procesa video cuadro por cuadro de forma offline o en paralelo.

### Reglas Críticas:
1. **PROHIBIDO** el uso de:
   - Transiciones o animaciones CSS (`transition: all 0.3s`, `@keyframes`, clases animadas de Tailwind).
   - Temporizadores asíncronos (`setTimeout`, `setInterval`, `requestAnimationFrame`).
   - `Date.now()`, marcas de tiempo del sistema operativo o `Math.random()` sin semilla estática durante el render.
2. **OBLIGATORIO**:
   - Todo estado visual debe ser una función matemática pura del frame actual:
     $$\text{Estado Visual} = f(\text{frame}, \text{fps})$$
   - Obtener siempre el contexto mediante los hooks oficiales:
     ```tsx
     import { useCurrentFrame, useVideoConfig } from "remotion";

     export const MyComponent: React.FC = () => {
       const frame = useCurrentFrame();
       const { fps, width, height, durationInFrames } = useVideoConfig();
       // ...
     };
     ```

---

## 3. Interpolaciones Matemáticas con `interpolate()`

Para cualquier valor que cambie suavemente en el tiempo (opacidad, posición, escala, rotación), usar `interpolate()` con control de desbordamiento (*clamping*).

```tsx
import { interpolate, useCurrentFrame } from "remotion";

const frame = useCurrentFrame();

// Opacidad suave (Fade In de 0 a 15 frames)
const opacity = interpolate(frame, [0, 15], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});

// Movimiento de cámara (Pan vertical sutil continuo)
const translateY = interpolate(frame, [0, durationInFrames], [0, -40], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
});
```

### Reglas de Estilizado en Transformaciones:
- Preferir propiedades CSS modernas desacopladas (`scale`, `translate`, `rotate`) sobre la propiedad compuesta `transform`, facilitando su edición en Remotion Studio.
- Para animaciones perceptuales de escala, usar `output: 'perceptual-scale'`.

---

## 4. Animaciones Elásticas con Física de Resortes `spring()`

Para elementos de alto impacto que requieren dinamismo orgánico (títulos gancho, palabras de subtítulos cinéticos, badges, stickers, entradas punch), utilizar `spring()`.

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Entrada con rebote elástico comenzando en delayFrame
const entranceScale = spring({
  frame: frame - delayFrame,
  fps,
  config: {
    damping: 12,    // Amortiguación (menor valor = mayor rebote/oscilación)
    mass: 0.5,      // Masa del elemento (menor masa = respuesta más ágil)
    stiffness: 180, // Rigidez del resorte (mayor rigidez = velocidad de impacto superior)
  },
});
```

### Perfiles de Resorte Recomendados para Retención Viral:
- **Impacto / Punch Gancho**: `{ damping: 10, mass: 0.45, stiffness: 220 }` (rebote rápido y contundente).
- **Subtítulo Palabra por Palabra (Kinetic)**: `{ damping: 12, mass: 0.55, stiffness: 160 }` (acompaña la prosodia de voz).
- **Entrada Suave / Badge**: `{ damping: 18, mass: 0.8, stiffness: 130 }` (sin oscilaciones excesivas).

---

## 5. Manejo Optimizado de Multimedia: `<Img>`, `<Audio>` y `<Video>`

Remotion provee envoltorios que aseguran que los recursos multimedia carguen y sincronicen frame a frame sin parpadeos ni pérdidas de sincronización.

### 5.1. Imágenes con `<Img />`
- **NUNCA** usar la etiqueta HTML `<img />`. Usar `<Img>` importado de `remotion`.
- Garantiza que la imagen esté totalmente cargada antes de renderizar el fotograma actual.
```tsx
import { Img, staticFile } from "remotion";

<Img
  src={staticFile("images/bg_overlay.png")}
  style={{
    width: "100%",
    height: "100%",
    objectFit: "cover",
  }}
/>
```

### 5.2. Audio con `<Audio />` y Ducking Sonora
- Importar `<Audio>` desde `remotion` o `@remotion/media`.
- Manejar locución principal a volumen `1.0`.
- Aplicar **Audio Ducking** en música ambiental (`volume: 0.12`, equivalente a -18dB) para preservar la inteligibilidad de la voz y cumplir el estándar EBU R128 (-14 LUFS global).
```tsx
import { Audio, Sequence, staticFile } from "remotion";

{/* Música de fondo atenuada en bucle */}
{ambientTrackSrc && (
  <Audio
    src={staticFile(ambientTrackSrc)}
    volume={0.12}
    loop
  />
)}

{/* Locución por escenas sincronizada */}
<Sequence from={scene.fromFrame} durationInFrames={scene.durationInFrames}>
  <Audio src={staticFile(scene.audioSrc)} volume={1.0} />
</Sequence>
```

### 5.3. Video con `<Video />`
- Importar `<Video>` desde `remotion` o `@remotion/media`.
- Configurar `muted` en clips de fondo cuando la pista de audio se gestiona por separado en `<AudioLayer>`.

---

## 6. Organización de Capas y Zona Segura de TikTok

Para evitar solapamientos con la interfaz de usuario de TikTok (botones laterales de like/share, título inferior y nombre de usuario):

1. **Estructura en Capas con `<AbsoluteFill>`**:
   - **Capa 0 (Fondo/Video)**: `<VideoLayer>` con Ken Burns o escala centrada (`objectFit: "cover"`).
   - **Capa 1 (Overlays/Atmósfera)**: Vignette oscuro, degradado radial o grano fílmico.
   - **Capa 2 (Tercio Superior)**:
     - Barra de retención horizontal superior (`height: 14px`, `top: 0`).
     - Badge de categoría y Título Gancho en caja semitransparente con `backdropFilter: "blur(6px)"` entre `top: 60px` y `top: 280px`.
   - **Capa 3 (Tercio Inferior - Subtítulos)**:
     - Margen vertical inferior seguro: `bottom: 380px` a `420px` (por encima de la descripción de TikTok).
     - Palabras dinámicas en páginas cortas (2 a 3 palabras), tipografía pesada (`Arial Black`, `Montserrat 900`) con color de acento vibrante (`#FFE500` amarillo neón o `#FF0033` rojo impacto).

---

## 7. Comandos CLI Operativos (Entorno `C:\tiktok\remotion\`)

Todas las operaciones por terminal deben ejecutarse dentro de `C:\tiktok\remotion\`:

- **Previsualización interactiva (Studio)**:
  ```powershell
  npx remotion studio src/index.ts
  ```
  *(Disponible también mediante el acceso directo `C:\tiktok\abrir_remotion_studio.bat` en `http://localhost:3000`).*

- **Listado y validación de composiciones**:
  ```powershell
  npx remotion compositions src/index.ts
  ```

- **Renderizado de fotograma testigo (Still)**:
  ```powershell
  npx remotion still Root preview.png --props=public/props.json --frame=60
  ```

- **Renderizado de video cinemático final (Optimizado para 8GB RAM)**:
  ```powershell
  npx remotion render Root ..\video_final_remotion.mp4 --props=public/props.json --concurrency=2 --gl=angle
  ```
  *Nota*: El flag `--concurrency=2` limita los procesos paralelos de Chrome para no saturar la memoria RAM en equipos con 8 GB.

---

## 8. Integración con el Pipeline Automatizado de Factoría V33.7

Esta skill se activa y rige la ejecución del orquestador Python [render_remotion.py](file:///c:/tiktok/render_remotion.py):
- Recopila guiones estructurados (`script.json`).
- Copia assets dinámicos a `C:\tiktok\remotion\public\`.
- Genera el archivo dinámico `props.json`.
- Desencadena el renderizado nativo por CLI garantizando fidelidad milimétrica y retención algorítmica.
