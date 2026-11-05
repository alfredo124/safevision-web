/**
 * Dirección del backend para HTTP y WebSocket.
 *
 * - VITE_API_URL (en .env.local): por ejemplo http://192.168.1.20:8000 o https://mi-tunel.example.
 * - Vacía: el mismo equipo que sirve la página, puerto 8000. Así, en la LAN, otro equipo que
 *   abre http://IP:5173 usa http://IP:8000 sin recompilar si cambia la IP.
 * El WebSocket se deriva: http -> ws, https -> wss (una página HTTPS exige wss).
 */
const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const API_BASE = (configured || `${window.location.protocol}//${window.location.hostname}:8000`).replace(/\/+$/, '');

export const WS_BASE = API_BASE.replace(/^http/i, 'ws');
