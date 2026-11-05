import { useEffect, useState, type Ref } from 'react';
import { API_BASE } from '../../services/apiConfig';
import { authService } from '../../services/authService';

/**
 * Miniatura que pide una imagen suelta cada `intervalMs` (1 por segundo por defecto).
 * No deja una conexión abierta como el video MJPEG, así varias pestañas y cámaras no agotan
 * el límite de conexiones del navegador. El token va en la cabecera, no en la URL.
 */
export function SnapshotImage({ cameraId, sync, alt, className, intervalMs = 1000, ref }: {
  cameraId: number;
  sync: boolean;
  alt: string;
  className?: string;
  intervalMs?: number;
  ref?: Ref<HTMLImageElement>;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let current: string | null = null;
    let timer: number | undefined;
    const load = async () => {
      const token = authService.getCurrentUser()?.token;
      try {
        if (!token) return;
        const response = await fetch(`${API_BASE}/modules/ai_vision/snapshot/${cameraId}?sync=${sync}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!response.ok || !active) return;
        const next = URL.createObjectURL(await response.blob());
        if (!active) {
          URL.revokeObjectURL(next);
          return;
        }
        if (current) URL.revokeObjectURL(current);
        current = next;
        setUrl(next);
      } catch {
        /* sin conexión: se reintenta en el siguiente ciclo */
      } finally {
        // La siguiente petición sale cuando termina la anterior: nunca se acumulan.
        if (active) timer = window.setTimeout(() => void load(), intervalMs);
      }
    };
    void load();
    return () => {
      active = false;
      window.clearTimeout(timer);
      if (current) URL.revokeObjectURL(current);
    };
  }, [cameraId, sync, intervalMs]);

  return url ? <img ref={ref} src={url} alt={alt} className={className} /> : <img ref={ref} alt={alt} className={className} />;
}
