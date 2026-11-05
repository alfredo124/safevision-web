import { useEffect, useState, type RefObject } from 'react';
import type { OverlayMessage } from '../../hooks/useCameraOverlay';

type Fase = 'conectando' | 'sin_practica' | 'sincronizando' | 'analizando' | 'lento' | 'reconectando';

/**
 * Barra de estado de una cámara: dice en qué fase está (conectando, sincronizando,
 * analizando), cuánto falta y si todo va bien.
 */
export function EstadoCamara({ overlay, videoRef }: { overlay: OverlayMessage | null; videoRef: RefObject<HTMLImageElement | null> }) {
  const [now, setNow] = useState(() => Date.now());
  const [videoReady, setVideoReady] = useState(false);
  useEffect(() => {
    // Un <img> MJPEG no siempre dispara onload: se considera conectado cuando ya tiene imagen.
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setVideoReady((videoRef.current?.naturalWidth ?? 0) > 0);
    }, 250);
    return () => window.clearInterval(timer);
  }, [videoRef]);
  const rate = overlay?.analysis_rate && overlay.analysis_rate > 0 ? overlay.analysis_rate : 0;
  const interval = rate ? 1 / rate : 3;
  const delay = overlay?.sync_delay ?? 0;

  let fase: Fase;
  let progreso = 0;
  let texto: string;
  if (overlay?.reconnecting) {
    fase = 'reconectando';
    texto = 'Cámara sin señal: reconectando… (no se generan alertas)';
  } else if (!videoReady) {
    fase = 'conectando';
    texto = 'Conectando video…';
  } else if (!overlay?.monitoring) {
    fase = 'sin_practica';
    texto = 'Práctica no iniciada: el video no se analiza';
  } else if (overlay.warming_up || overlay.analysis_id === undefined) {
    fase = 'sincronizando';
    const esperado = delay + interval + 1;
    const transcurrido = overlay.started_at ? now / 1000 - overlay.started_at : 0;
    progreso = Math.min(0.95, Math.max(0, transcurrido / esperado));
    const restante = Math.max(1, Math.ceil(esperado - transcurrido));
    texto = `Sincronizando video y análisis… ~${restante} s`;
  } else {
    const edad = (now - (overlay.received_at ?? now)) / 1000;
    progreso = Math.min(1, edad / interval);
    const ritmo = `≈${rate.toFixed(1)} análisis/s`;
    const retraso = overlay.sync && delay > 0 ? ` · retraso ${delay.toFixed(1)} s` : ' · en vivo';
    if (edad > 2.5 * interval) {
      fase = 'lento';
      texto = `Análisis lento: último hace ${Math.round(edad)} s`;
    } else {
      fase = 'analizando';
      texto = `Analizando · ${ritmo}${retraso}`;
    }
  }

  const color = {
    conectando: 'bg-sky-500',
    sin_practica: 'bg-gray-600',
    sincronizando: 'bg-sky-500',
    analizando: 'bg-emerald-500',
    lento: 'bg-amber-500',
    reconectando: 'bg-amber-500',
  }[fase];
  const indeterminado = fase === 'conectando' || fase === 'reconectando';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-black/70 px-2 pb-1 pt-0.5 backdrop-blur-sm" role="status" aria-live="polite">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-200">
        <span className={`h-1.5 w-1.5 rounded-full ${color} ${fase === 'analizando' ? '' : 'animate-pulse'}`} />
        {texto}
      </p>
      {fase !== 'sin_practica' && (
        <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-gray-800">
          <div
            className={`h-full ${color} ${indeterminado ? 'w-1/3 animate-pulse' : 'transition-[width] duration-200'}`}
            style={indeterminado ? undefined : { width: `${Math.round(progreso * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
