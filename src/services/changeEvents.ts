import { useEffect, useRef } from 'react';
import { authService } from './authService';
import { WS_BASE } from './apiConfig';

/** Temas que avisa el backend (app/core/events.py). */
export type ChangeTopic = 'cameras' | 'workshops' | 'practica' | 'incidents';
type Listener = (topics: ChangeTopic[]) => void;

/**
 * Una sola conexión por pestaña a /ws/events: cuando alguien agrega o quita una cámara, cambia un
 * taller, inicia una práctica o llega una alerta, las pantallas abiertas vuelven a pedir sus datos.
 * El aviso no trae datos; cada pantalla consulta con su sesión, como siempre.
 */
const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let retry: number | undefined;
let attempt = 0;

function connect() {
  const token = authService.getCurrentUser()?.token;
  if (!token || socket || listeners.size === 0) return;
  const current = new WebSocket(`${WS_BASE}/ws/events?token=${encodeURIComponent(token)}`);
  socket = current;
  current.onopen = () => {
    // Tras reconectar pudo haber cambios perdidos: todas las pantallas se refrescan una vez.
    if (attempt > 0) listeners.forEach(listener => listener(['cameras', 'workshops', 'practica', 'incidents']));
    attempt = 0;
  };
  current.onmessage = event => {
    try {
      const data = JSON.parse(event.data as string) as { type: string; topics?: ChangeTopic[] };
      if (data.type === 'changed' && data.topics?.length) listeners.forEach(listener => listener(data.topics!));
    } catch { /* ignorar */ }
  };
  current.onclose = event => {
    if (socket === current) socket = null;
    if (event.code === 4401 || listeners.size === 0) return;  // sin sesión o nadie escucha
    attempt += 1;
    retry = window.setTimeout(connect, Math.min(10000, 1000 * attempt));
  };
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.clearTimeout(retry);
      socket?.close();
      socket = null;
      attempt = 0;
    }
  };
}

/** Llama a `onChange` cuando el servidor avisa de un cambio en alguno de los temas indicados. */
export function useServerChanges(topics: ChangeTopic[], onChange: (topics: ChangeTopic[]) => void) {
  const callback = useRef(onChange);
  useEffect(() => { callback.current = onChange; });
  const key = topics.join(',');
  useEffect(() => {
    const wanted = key.split(',') as ChangeTopic[];
    return subscribe(changed => {
      const relevant = changed.filter(topic => wanted.includes(topic));
      if (relevant.length) callback.current(relevant);
    });
  }, [key]);
}
