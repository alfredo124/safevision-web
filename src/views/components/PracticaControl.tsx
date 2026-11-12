import { useServerChanges } from '../../services/changeEvents';
import { useCallback, useEffect, useState } from 'react';
import { Play, Square, Activity } from 'lucide-react';
import { reglasLabService, type CameraMonitoringStatus, type PracticeSession } from '../../services/reglasLabService';
import { duracion } from '../../services/formatoReporte';
import { authService } from '../../services/authService';
import { API_BASE } from '../../services/apiConfig';

interface Rendimiento {
  measured: boolean;
  ms_per_analysis: number | null;
  device: string | null;
  hint: string | null;
  max_fps: number;
  manual: boolean;
  physical_cores?: number | null;
  /** Cámaras que analizan a la vez en este equipo (las demás esperan su turno). */
  analysis_slots?: number;
  /** Cómo se decidió: regla por núcleos, medido en este equipo o fijado a mano. */
  slots_source?: 'regla' | 'medido' | 'manual' | null;
}

const ORIGEN_SIMULTANEOS: Record<string, string> = { regla: 'según sus núcleos', medido: 'medido en este equipo', manual: 'fijado a mano' };

/** Inicia o finaliza el monitoreo de un taller. El análisis sigue aunque se cierre esta página. */
export function PracticaControl({ workshopId }: { workshopId: number }) {
  const [cameras, setCameras] = useState<CameraMonitoringStatus[]>([]);
  const [active, setActive] = useState(false);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [checkedAt, setCheckedAt] = useState(0);  // hora (s) de la última consulta de estado
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rendimiento, setRendimiento] = useState<Rendimiento | null>(null);

  const refresh = useCallback(async () => {
    try {
      const status = await reglasLabService.getMonitoring(workshopId);
      setCameras(status.cameras);
      setActive(Boolean(status.active));
      setSession(status.session ?? null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'No se pudo consultar el monitoreo.');
    }
  }, [workshopId]);

  useEffect(() => {
    let active = true;
    const poll = () => reglasLabService.getMonitoring(workshopId)
      .then(status => {
        if (!active) return;
        setCameras(status.cameras);
        setActive(Boolean(status.active));
        setSession(status.session ?? null);
        setCheckedAt(Date.now() / 1000);
      })
      .catch(() => { /* se reintenta en el siguiente ciclo */ });
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    return () => { active = false; window.clearInterval(timer); };
  }, [workshopId]);

  // Equipo detectado y límite por cámara (se mide al iniciar la primera práctica).
  const loadRendimiento = useCallback(() => {
    const token = authService.getCurrentUser()?.token;
    if (!token) return;
    fetch(`${API_BASE}/modules/ai_vision/rendimiento`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => (response.ok ? response.json() as Promise<Rendimiento> : null))
      .then(data => { if (data) setRendimiento(data); })
      .catch(() => { /* informativo */ });
  }, []);
  useEffect(() => { loadRendimiento(); }, [loadRendimiento]);

  // Práctica iniciada o detenida desde otro equipo, o cámaras del taller cambiadas.
  useServerChanges(['practica', 'workshops', 'cameras'], () => { void refresh(); loadRendimiento(); });

  // En curso aunque aún no haya cámaras: las que se asignen después se analizan al guardar.
  const running = active || cameras.some(camera => camera.running);

  const toggle = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = running
        ? await reglasLabService.stopMonitoring(workshopId)
        : await reglasLabService.startMonitoring(workshopId);
      const problems = result.cameras.filter(camera => camera.started === false).map(camera => `Cámara ${camera.camera_id}: ${camera.detail}`);
      if (!running && result.cameras.length === 0) setMessage('El taller no tiene cámaras asignadas.');
      else if (problems.length) setMessage(problems.join(' · '));
      else if (running && result.session) {
        const s = result.session;
        setMessage(`Práctica ${s.code} guardada: ${duracion(s.duration_seconds)}, ${s.alerts} alertas.`);
      }
      await refresh();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'No se pudo cambiar el monitoreo.');
    } finally {
      setBusy(false);
    }
  };

  const analyses = cameras.reduce((total, camera) => total + (camera.analyses ?? 0), 0);
  // Ritmo real de análisis por cámara: con varias cámaras en CPU baja bastante.
  const rates = cameras.filter(camera => camera.running && camera.started_at).map(camera =>
    (camera.analyses ?? 0) / Math.max(1, checkedAt - (camera.started_at ?? 0)));
  const rate = rates.length ? Math.min(...rates) : 0;
  const alerts = cameras.reduce((total, camera) => total + (camera.events ?? 0), 0);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-800 bg-[#16181e] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <Activity className={`h-5 w-5 ${running ? 'text-emerald-400' : 'text-gray-500'}`} />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gray-200">
            Práctica {running ? 'en curso: monitoreo activo' : 'sin iniciar: no se generan alertas'}
          </p>
          <p className="text-[11px] text-gray-400">
            {running
              ? `${analyses} análisis (≈${rate.toFixed(1)}/s por cámara) · ${alerts} alertas. Continúa aunque cierres esta página.`
              : 'Al iniciar, se analizan todas las cámaras asignadas a este taller.'}
          </p>
          {running && session && (
            <p className="text-[10px] text-gray-400">
              Sesión <span className="font-mono text-indigo-300">{session.code}</span>
              {' '}· desde las {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {session.started_by_name && ` · iniciada por ${session.started_by_name}`}
              {' '}· todo lo detectado queda guardado en esta sesión
            </p>
          )}
          {rendimiento && (
            <p className="text-[10px] text-gray-500">
              {rendimiento.measured && rendimiento.ms_per_analysis
                ? `Equipo: ${rendimiento.device} · ${(rendimiento.ms_per_analysis / 1000).toFixed(2)} s por análisis · `
                : 'El equipo se mide al iniciar la primera práctica · '}
              hasta {rendimiento.max_fps} análisis/s por cámara ({rendimiento.manual ? 'fijado a mano' : 'automático'})
              {rendimiento.slots_source && (
                <>
                  {' · '}{rendimiento.analysis_slots === 1 ? 'las cámaras se turnan (1 análisis a la vez)' : `${rendimiento.analysis_slots} cámaras analizan a la vez`}
                  {rendimiento.physical_cores ? `, ${rendimiento.physical_cores} núcleos` : ''} ({ORIGEN_SIMULTANEOS[rendimiento.slots_source] ?? rendimiento.slots_source})
                </>
              )}
            </p>
          )}
          {rendimiento?.hint && <p className="text-[10px] text-amber-300">{rendimiento.hint}</p>}
          {message && <p role="alert" className="mt-1 text-[11px] text-amber-400">{message}</p>}
        </div>
      </div>
      <button
        onClick={() => void toggle()}
        disabled={busy}
        className={`flex items-center justify-center gap-2 rounded px-4 py-2 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
          running ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
      >
        {running ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        <span>{running ? 'Finalizar práctica' : 'Iniciar práctica'}</span>
      </button>
    </div>
  );
}
