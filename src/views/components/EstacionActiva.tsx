import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Smartphone, Square } from 'lucide-react';
import { ACTIVE_STATES, attachPreview, stopEstacion, useEstacion } from '../../services/stationStream';

const DETENIDA_POR: Partial<Record<string, string>> = {
  otra_estacion: 'otro equipo está transmitiendo esa cámara',
  sin_acceso: 'sin acceso o la sesión caducó',
  sin_permiso: 'el navegador quitó el permiso de la cámara',
  ocupada: 'otra aplicación está usando la cámara',
  error: 'error con la cámara',
};

/** Aviso en todas las páginas mientras este dispositivo transmite su cámara (salvo en la propia estación). */
export function EstacionActiva() {
  const estacion = useEstacion();
  const { pathname } = useLocation();
  const visible = ACTIVE_STATES.includes(estacion.estado) && pathname !== '/estacion';
  const thumbRef = useRef<HTMLVideoElement>(null);
  // Miniatura en vivo: además de mostrar qué se transmite, mantiene el video activo en el celular.
  useEffect(() => (visible && thumbRef.current ? attachPreview(thumbRef.current) : undefined), [visible]);
  if (pathname === '/estacion') return null;
  const motivo = estacion.cameraId ? DETENIDA_POR[estacion.estado] : undefined;
  if (motivo) {
    // Se detuvo sin que nadie pulsara «Detener»: se avisa en cualquier página.
    return (
      <Link to="/estacion" className="flex shrink-0 items-center gap-1.5 border-b border-red-800 bg-red-950/60 px-3 py-1.5 text-[11px] text-red-200">
        <Smartphone className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">La cámara{estacion.cameraName ? ` «${estacion.cameraName}»` : ''} dejó de transmitir: {motivo}. Toca para revisarla.</span>
      </Link>
    );
  }
  if (!visible) return null;
  const reconnecting = estacion.estado !== 'transmitiendo';

  return (
    <div className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5 text-[11px] ${
      reconnecting ? 'border-amber-700 bg-amber-950/50 text-amber-200' : 'border-emerald-800 bg-emerald-950/50 text-emerald-200'}`}>
      <Link to="/estacion" className="flex min-w-0 items-center gap-1.5">
        <video ref={thumbRef} muted playsInline className="h-8 w-11 shrink-0 rounded bg-black object-cover" />
        <Smartphone className="h-3.5 w-3.5 shrink-0 animate-pulse" />
        <span className="truncate">
          {reconnecting ? 'Reconectando la cámara' : 'Transmitiendo la cámara'}
          {estacion.cameraName ? ` «${estacion.cameraName}»` : ''} · {estacion.enviados} imágenes
        </span>
      </Link>
      <button onClick={() => stopEstacion()} className="flex shrink-0 items-center gap-1 rounded bg-red-700 px-2 py-1 font-semibold text-white hover:bg-red-600">
        <Square className="h-3 w-3" /> Detener
      </button>
    </div>
  );
}
