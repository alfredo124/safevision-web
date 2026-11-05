import { useEffect, useState } from 'react';

const WS_URL = 'ws://localhost:8000';
/** Un mensaje se considera viejo tras 3 s o 2.5 intervalos de análisis, lo que sea mayor
 *  (con varias cámaras en CPU cada una se analiza solo ~0.3 veces/s). */
const MIN_STALE_MS = 3000;
export const staleAfterMs = (rate?: number) => Math.max(MIN_STALE_MS, rate && rate > 0 ? 2500 / rate : 0);

export interface OverlayRuleRef {
  equipment_id: string;
  rule_code: string | null;
  severity?: string;
}

export interface OverlayPerson {
  track_id: number;
  box: [number, number, number, number];
  state: 'INCUMPLE' | 'EN_RIESGO' | 'CUMPLE' | 'PARCIAL';
  severity: string | null;
  color: string;
  label: string;
  missing: OverlayRuleRef[];
  at_risk: OverlayRuleRef[];
  unverified: string[];
  manual: OverlayRuleRef[];
  progress: number;
}

export interface OverlayMessage {
  camera_id: number;
  analysis_id?: number;
  timestamp?: number;
  frame_size?: [number, number] | null;
  monitoring: boolean;
  people: OverlayPerson[];
  /** Práctica iniciada pero todavía sin un análisis que mostrar. */
  warming_up?: boolean;
  sync?: boolean;
  sync_delay?: number;
  analysis_rate?: number;
  started_at?: number;
  /** Hora local (ms) en que llegó el mensaje. La pone el cliente. */
  received_at?: number;
}

export type EquipmentInfo = Record<string, { icon: string; name: string }>;

/** Mensajes del motor por WebSocket. Devuelve null si no hay datos recientes o se cortó la conexión. */
export function useCameraOverlay(cameraId: number, token: string | undefined, sync = true): OverlayMessage | null {
  const [message, setMessage] = useState<{ data: OverlayMessage; receivedAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!token) return;
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    let closed = false;
    const connect = () => {
      socket = new WebSocket(`${WS_URL}/modules/ai_vision/ws/detections/${cameraId}?token=${encodeURIComponent(token)}&sync=${sync ? 1 : 0}`);
      socket.onmessage = event => {
        try {
          const receivedAt = Date.now();
          setMessage({ data: { ...(JSON.parse(event.data) as OverlayMessage), received_at: receivedAt }, receivedAt });
        } catch {
          /* mensaje inválido: se ignora */
        }
      };
      socket.onclose = () => {
        setMessage(null);  // sin conexión no se muestran recuadros
        if (!closed) retry = window.setTimeout(connect, 2000);
      };
    };
    connect();
    const ticker = window.setInterval(() => setNow(Date.now()), 500);
    return () => {
      closed = true;
      window.clearTimeout(retry);
      window.clearInterval(ticker);
      socket?.close();
    };
  }, [cameraId, token, sync]);

  if (!message || now - message.receivedAt > staleAfterMs(message.data.analysis_rate)) return null;
  return message.data;
}
