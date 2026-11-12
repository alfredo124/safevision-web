/**
 * Dirección del backend para HTTP y WebSocket.
 *
 * - VITE_API_URL (en .env.local): por ejemplo http://192.168.1.20:8000 o https://mi-tunel.example.
 * - Vacía: el mismo equipo que sirve la página, puerto 8000. Así, en la LAN, otro equipo que
 *   abre http://IP:5173 usa http://IP:8000 sin recompilar si cambia la IP.
 * El WebSocket se deriva: http -> ws, https -> wss (una página HTTPS exige wss).
 */
const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

// "localhost" en Windows prueba primero IPv6 (::1); el backend escucha en IPv4 (0.0.0.0) y cada conexión
// nueva esperaba ~2 s antes de reintentar (medido el 2026-11-12: 2044 ms frente a 14 ms con 127.0.0.1).
// Es el mismo equipo, así que se usa 127.0.0.1 directamente. El certificado HTTPS local lo incluye.
const host = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;

export const API_BASE = (configured || `${window.location.protocol}//${host}:8000`).replace(/\/+$/, '');

export const WS_BASE = API_BASE.replace(/^http/i, 'ws');
