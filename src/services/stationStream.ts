import { useSyncExternalStore } from 'react';
import { authService } from './authService';
import { WS_BASE } from './apiConfig';

/**
 * Transmisión de la estación de cámara, independiente de la página.
 *
 * Sigue al ir a Monitoreo u otra vista del mismo navegador, hasta que se pulsa "Detener" o se cierra
 * la sesión. Las imágenes se toman de un video visible (la vista previa de la estación o la miniatura
 * de la barra superior) y, si no hay ninguno, de un video oculto; los celulares pausan a veces los
 * videos invisibles, por eso se prefiere uno visible y se reanuda si se pausó.
 */
export type EstadoEstacion = 'detenida' | 'pidiendo_permiso' | 'sin_permiso' | 'ocupada' | 'conectando'
  | 'transmitiendo' | 'reconectando' | 'otra_estacion' | 'sin_acceso' | 'inseguro' | 'error';
export type Facing = 'environment' | 'user';
export type FuenteCamara = { facing: Facing } | { deviceId: string };

export interface EstacionSnapshot {
  estado: EstadoEstacion;
  cameraId: number | null;
  cameraName: string | null;
  fps: number;
  enviados: number;
  media: MediaStream | null;
  /** Cámara del dispositivo en uso, según el propio navegador (no según lo elegido). */
  facing: Facing | null;
  deviceId: string | null;
  deviceLabel: string | null;
  cambiando: boolean;
}

const MAX_WIDTH = 640;
const ACK_TIMEOUT_MS = 5000;
const LAST_CAMERA_KEY = 'safevision_estacion_camara';
export const ACTIVE_STATES: EstadoEstacion[] = ['conectando', 'transmitiendo', 'reconectando'];

let snapshot: EstacionSnapshot = {
  estado: window.isSecureContext ? 'detenida' : 'inseguro',
  // Imágenes por segundo enviadas: es la fluidez del video en Monitoreo. El análisis va a su propio
  // ritmo (límite del servidor) y siempre toma la última imagen, así que enviar más no lo recarga.
  cameraId: null, cameraName: null, fps: 10, enviados: 0, media: null,
  facing: null, deviceId: null, deviceLabel: null, cambiando: false,
};
const listeners = new Set<() => void>();
const previews = new Set<HTMLVideoElement>();
let hidden: HTMLVideoElement | null = null;
let socket: WebSocket | null = null;
let timer: number | undefined;
let retry: number | undefined;
let waitingAck = 0;  // hora (ms) del frame pendiente de confirmar; 0 = libre
let active = false;
let wakeLock: { release: () => Promise<void> } | null = null;
let fuente: FuenteCamara = { facing: 'environment' };

function update(changes: Partial<EstacionSnapshot>) {
  snapshot = { ...snapshot, ...changes };
  listeners.forEach(listener => listener());
}

export function lastCameraId(): number | null {
  try { return Number(localStorage.getItem(LAST_CAMERA_KEY)) || null; } catch { return null; }
}

function hiddenVideo(): HTMLVideoElement {
  if (!hidden) {
    hidden = document.createElement('video');
    hidden.muted = true;
    hidden.playsInline = true;
    hidden.setAttribute('playsinline', '');
    Object.assign(hidden.style, { position: 'fixed', left: '0', bottom: '0', width: '2px', height: '2px', opacity: '0', pointerEvents: 'none' });
    document.body.appendChild(hidden);
  }
  return hidden;
}

/** La vista previa de la estación y la miniatura de la barra se registran como fuentes visibles. */
export function attachPreview(element: HTMLVideoElement): () => void {
  previews.add(element);
  element.muted = true;
  element.playsInline = true;
  element.srcObject = snapshot.media;
  if (snapshot.media) void element.play().catch(() => undefined);
  return () => { previews.delete(element); };
}

function source(): HTMLVideoElement | null {
  for (const element of previews) {
    if (element.isConnected && element.srcObject === snapshot.media && element.videoWidth) {
      if (element.paused) void element.play().catch(() => undefined);
      return element;
    }
  }
  if (hidden && hidden.paused && snapshot.media) void hidden.play().catch(() => undefined);
  return hidden && hidden.videoWidth ? hidden : null;
}

function sendFrame() {
  const video = source();
  const current = socket;
  if (!video || !current || current.readyState !== WebSocket.OPEN || snapshot.cambiando) return;
  // Control de saturación: no se envía otro frame hasta que el servidor confirme el anterior.
  if (waitingAck && Date.now() - waitingAck < ACK_TIMEOUT_MS) return;
  const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
  waitingAck = Date.now();
  canvas.toBlob(blob => {
    if (blob && current.readyState === WebSocket.OPEN) {
      current.send(blob);
      update({ enviados: snapshot.enviados + 1 });
    } else {
      waitingAck = 0;
    }
  }, 'image/jpeg', 0.7);
}

function connect(id: number) {
  const token = authService.getCurrentUser()?.token;
  if (!active) return;
  if (!token) { stopEstacion('sin_acceso'); return; }
  update({ estado: snapshot.estado === 'transmitiendo' || snapshot.estado === 'reconectando' ? 'reconectando' : 'conectando' });
  const current = new WebSocket(`${WS_BASE}/modules/ai_vision/ws/ingest/${id}?token=${encodeURIComponent(token)}`);
  current.binaryType = 'arraybuffer';
  socket = current;
  current.onopen = () => { waitingAck = 0; update({ estado: 'transmitiendo' }); };
  current.onmessage = event => {
    try {
      const data = JSON.parse(event.data as string) as { ack?: number; error?: string };
      if (data.ack !== undefined || data.error) waitingAck = 0;
    } catch { /* ignorar */ }
  };
  current.onclose = event => {
    if (socket === current) socket = null;
    if (!active) return;
    // El servidor indica el motivo (sesión, permiso, cámara eliminada u ocupada): no se reintenta en bucle.
    if (event.code === 4409) { stopEstacion('otra_estacion'); return; }
    if ([4400, 4401, 4403, 4404].includes(event.code)) { stopEstacion('sin_acceso'); return; }
    update({ estado: 'reconectando' });
    retry = window.setTimeout(() => connect(id), 2000);
  };
}

async function requestWakeLock() {
  try {
    const api = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    wakeLock = await api?.request('screen') ?? null;
  } catch { /* no disponible */ }
}

function constraints(choice: FuenteCamara): MediaStreamConstraints {
  const size = { width: { ideal: 640 }, height: { ideal: 480 } };
  return {
    video: 'deviceId' in choice ? { deviceId: { exact: choice.deviceId }, ...size } : { facingMode: { ideal: choice.facing }, ...size },
    audio: false,
  };
}

function applyMedia(media: MediaStream, choice: FuenteCamara) {
  const track = media.getVideoTracks()[0];
  const settings = track?.getSettings() ?? {};
  // Lo que el navegador dice que está usando: en laptops facingMode no existe y se toma lo elegido.
  const facing = (settings.facingMode as Facing | undefined) ?? ('facing' in choice ? choice.facing : null);
  const element = hiddenVideo();
  element.srcObject = media;
  void element.play().catch(() => undefined);
  previews.forEach(preview => { preview.srcObject = media; void preview.play().catch(() => undefined); });
  update({ media, facing, deviceId: settings.deviceId ?? null, deviceLabel: track?.label || null });
}

function errorState(reason: unknown): EstadoEstacion {
  const name = reason instanceof DOMException ? reason.name : '';
  return name === 'NotAllowedError' || name === 'SecurityError' ? 'sin_permiso' : name === 'NotReadableError' ? 'ocupada' : 'error';
}

export async function startEstacion(options: { cameraId: number; cameraName: string | null; fuente: FuenteCamara; fps: number }) {
  if (!window.isSecureContext) { update({ estado: 'inseguro' }); return; }
  if (active) stopEstacion('detenida');
  fuente = options.fuente;
  update({ estado: 'pidiendo_permiso', cameraId: options.cameraId, cameraName: options.cameraName, fps: options.fps, enviados: 0 });
  try {
    const media = await navigator.mediaDevices.getUserMedia(constraints(fuente));
    applyMedia(media, fuente);
    active = true;
    try { localStorage.setItem(LAST_CAMERA_KEY, String(options.cameraId)); } catch { /* sin almacenamiento */ }
    await requestWakeLock();
    connect(options.cameraId);
    timer = window.setInterval(sendFrame, 1000 / options.fps);
  } catch (reason) {
    update({ estado: errorState(reason) });
  }
}

/** Cambia de cámara (trasera/frontal u otra) sin cortar la conexión con el servidor. */
export async function cambiarCamara(choice: FuenteCamara): Promise<string | null> {
  if (!active || snapshot.cambiando) { fuente = choice; return null; }
  const previous = fuente;
  update({ cambiando: true });
  // Muchos celulares no abren dos cámaras a la vez: primero se suelta la actual.
  snapshot.media?.getTracks().forEach(track => track.stop());
  try {
    const media = await navigator.mediaDevices.getUserMedia(constraints(choice));
    fuente = choice;
    applyMedia(media, choice);
    return null;
  } catch (reason) {
    try {
      applyMedia(await navigator.mediaDevices.getUserMedia(constraints(previous)), previous);
    } catch { stopEstacion(errorState(reason)); }
    return 'No se pudo abrir esa cámara; se mantiene la anterior.';
  } finally {
    update({ cambiando: false });
  }
}

export function stopEstacion(estado: EstadoEstacion = 'detenida') {
  active = false;
  window.clearInterval(timer);
  window.clearTimeout(retry);
  socket?.close();
  socket = null;
  snapshot.media?.getTracks().forEach(track => track.stop());
  if (hidden) hidden.srcObject = null;
  previews.forEach(preview => { preview.srcObject = null; });
  void wakeLock?.release().catch(() => undefined);
  wakeLock = null;
  update({ estado, media: null, cambiando: false });
}

export function setEstacionFps(fps: number) {
  update({ fps });
  if (!active) return;
  window.clearInterval(timer);
  timer = window.setInterval(sendFrame, 1000 / fps);
}

// Al volver a la pantalla, el bloqueo de suspensión se pierde y el video puede quedar pausado.
document.addEventListener('visibilitychange', () => {
  if (!active || document.hidden) return;
  void requestWakeLock();
  source();
});
// Al cerrar sesión se corta la transmisión.
window.addEventListener('safevision:logout', () => { if (active) stopEstacion('detenida'); });

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useEstacion(): EstacionSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot);
}
