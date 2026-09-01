import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { TikTokVideo } from './TikTokVideo';
import scriptData from '../public/script.json';

export const EditorStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('Listo');
  const [keyTrigger, setKeyTrigger] = useState(Date.now());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scenes = Array.isArray(scriptData) ? scriptData : (scriptData as any).scenes || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalFrames = scenes.reduce((acc: number, curr: any) => acc + (curr.durationInFrames || 150), 0);
  const durationInFrames = Math.max(30, totalFrames || 1744);

  const handleSend = async () => {
    if (!prompt) return;
    setStatus('Aplicando cambio en caliente con Groq...');
    try {
      const res = await fetch('http://localhost:3001/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`¡Cambio aplicado con éxito! [${data.modo || 'OK'}]`);
        setKeyTrigger(Date.now());
      } else {
        setStatus('Error: ' + (data.error || 'No se pudo aplicar'));
      }
    } catch (e) {
      setStatus('Error conectando con el servidor local');
    }
    setPrompt('');
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#0c0d12', color: '#FFF', fontFamily: 'sans-serif' }}>
      {/* Panel Izquierdo: Player 9:16 */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
        <Player
          key={keyTrigger}
          component={TikTokVideo}
          durationInFrames={durationInFrames}
          fps={30}
          compositionWidth={1080}
          compositionHeight={1920}
          style={{ height: '92vh', aspectRatio: '9/16', borderRadius: '14px', boxShadow: '0 0 35px rgba(0,0,0,0.8)' }}
          controls
          autoPlay
          loop
        />
      </div>

      {/* Panel Derecho: Chat Conversacional */}
      <div style={{ width: '420px', borderLeft: '1px solid #1f2230', display: 'flex', flexDirection: 'column', backgroundColor: '#13151f', padding: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 900, marginBottom: '8px', color: '#FFE500' }}>FACTORÍA V34: CHAT STUDIO</h2>
        <p style={{ fontSize: '13px', color: '#8d94a5', marginBottom: '20px' }}>Escribe órdenes en lenguaje natural para retocar cualquier escena en tiempo real.</p>
        
        <div style={{ flex: 1, backgroundColor: '#090a0f', borderRadius: '8px', padding: '16px', border: '1px solid #1f2230', marginBottom: '16px', overflowY: 'auto' }}>
          <div style={{ fontSize: '14px', color: '#00F0FF', marginBottom: '10px' }}>[SISTEMA]: Conectado a Llama 3.3 70B vía Groq / Fallback Local.</div>
          <div style={{ fontSize: '14px', color: '#8d94a5' }}>Estado actual: {status}</div>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ej: En la escena 3 pon sacudida de terremoto y agrega alerta roja neon que diga ¡ALERTA!"
          style={{ width: '100%', height: '110px', backgroundColor: '#090a0f', color: '#FFF', border: '1px solid #2a2e42', borderRadius: '8px', padding: '12px', fontSize: '14px', resize: 'none', marginBottom: '12px' }}
        />

        <button
          onClick={handleSend}
          style={{ width: '100%', padding: '14px', backgroundColor: '#FF0055', color: '#FFF', fontWeight: 900, border: 'none', borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}
        >
          Ejecutar Orden Agéntica
        </button>
      </div>
    </div>
  );
};
