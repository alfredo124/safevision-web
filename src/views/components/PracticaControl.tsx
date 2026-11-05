import { useServerChanges } from '../../services/changeEvents';
import { useCallback, useEffect, useState } from 'react';
import { Play, Square, Activity } from 'lucide-react';
import { reglasLabService, type CameraMonitoringStatus } from '../../services/reglasLabService';
import { authService } from '../../services/authService';
import { API_BASE } from '../../services/apiConfig';

interface Rendimiento {
  measured: boolean;
  ms_per_analysis: number | null;
  device: string | null;
  hint: string | null;
  max_fps: number;
  manual: boolean;
}

/** Inicia o finaliza el monitoreo de un taller. El análisis sigue aunque se cierre esta página. */
export function PracticaControl({ workshopId }: { workshopId: number }) {
  const [cameras, setCameras] = useState<CameraMonitoringStatus[]>([]);
  const [active, setActive] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);  // hora (s) de la última consulta de estado
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [canClear, setCanClear] = useState(false);
  const [rendimiento, setRendimiento] = useState<Rendimiento | null>(null);
  const [clearPrevious, setClearPrevious] = useState(true);

  useEffect(() => {
    let active = true;
    reglasLabService.getTestMode()
      .then(mode => { if (active) setCanClear(mode.can_clear); })
      .catch(() => { /* sin modo prueba */ });
    return () => { active = false; };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const status = await reglasLabService.getMonitoring(workshopId);
      setCameras(status.cameras);
      setActive(Boolean(status.active));
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
    const clear = !running && canClear && clearPrevious;
    if (clear && !window.confirm('Fase de prueba: se borrarán todas las incidencias, alertas y capturas de este taller antes de iniciar. ¿Continuar?')) {
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = running
        ? await reglasLabService.stopMonitoring(workshopId)
        : await reglasLabService.startMonitoring(workshopId, clear);
      const problems = result.cameras.filter(camera => camera.started === false).map(camera => `Cámara ${camera.camera_id}: ${camera.detail}`);
      if (!running && result.cameras.length === 0) setMessage('El taller no tiene cámaras asignadas.');
      else if (problems.length) setMessage(problems.join(' · '));
      else if (clear) setMessage(`Se borraron ${result.cleared_incidents ?? 0} incidencias de prueba.`);
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
          {rendimiento && (
            <p className="text-[10px] text-gray-500">
              {rendimiento.measured && rendimiento.ms_per_analysis
                ? `Equipo: ${rendimiento.device} · ${(rendimiento.ms_per_analysis / 1000).toFixed(2)} s por análisis · `
                : 'El equipo se mide al iniciar la primera práctica · '}
              hasta {rendimiento.max_fps} análisis/s por cámara ({rendimiento.manual ? 'fijado a mano' : 'automático'})
            </p>
          )}
          {rendimiento?.hint && <p className="text-[10px] text-amber-300">{rendimiento.hint}</p>}
          {message && <p role="alert" className="mt-1 text-[11px] text-amber-400">{message}</p>}
          {!running && canClear && (
            <label className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-300">
              <input type="checkbox" checked={clearPrevious} onChange={event => setClearPrevious(event.target.checked)} />
              Borrar incidencias anteriores de este taller (fase de prueba)
            </label>
          )}
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
