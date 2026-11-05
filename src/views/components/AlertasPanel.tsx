import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, ChevronDown, ChevronUp, Image as ImageIcon, XCircle } from 'lucide-react';
import { authService } from '../../services/authService';
import { reglasLabService, type Incident, type ReviewAction } from '../../services/reglasLabService';
import { CapturaModal } from './CapturaModal';

const POLL_MS = 3000;

/** Pitido corto con Web Audio (sin archivos de sonido). */
function beep(frequency = 880) {
  try {
    const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.08;
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.25);
    oscillator.onended = () => void context.close();
  } catch {
    /* el navegador puede bloquear el audio hasta que el usuario interactúe */
  }
}

/**
 * Alertas pendientes del área del usuario, visibles en todas las páginas.
 * Una alerta solo desaparece cuando alguien la confirma o la descarta.
 */
export function AlertasPanel() {
  const [pending, setPending] = useState<Incident[]>([]);
  const [open, setOpen] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [discarding, setDiscarding] = useState<{ id: number; reason: string } | null>(null);
  const [captura, setCaptura] = useState<Incident | null>(null);
  const [error, setError] = useState('');
  const known = useRef<Set<number> | null>(null);
  const knownEscalated = useRef<Set<number>>(new Set());
  const isAdmin = authService.getCurrentUser()?.role === 'ADMINISTRADOR';

  useEffect(() => {
    let active = true;
    const poll = () => reglasLabService.getIncidents({ status: 'PENDIENTE' })
      .then(items => {
        if (!active) return;
        const ids = new Set(items.map(item => item.id));
        // Aviso sonoro y panel abierto solo si llegó una alerta nueva (no en la primera carga).
        if (known.current && items.some(item => !known.current?.has(item.id))) {
          beep();
          setOpen(true);
        }
        known.current = ids;
        // Alertas sin respuesta dentro del plazo: el administrador oye un aviso distinto.
        const escalated = items.filter(item => item.escalated);
        if (isAdmin && escalated.some(item => !knownEscalated.current.has(item.id))) {
          beep(660);
          window.setTimeout(() => beep(440), 300);
          setOpen(true);
        }
        knownEscalated.current = new Set(escalated.map(item => item.id));
        // Primero las que esperan demasiado; después, las más recientes.
        setPending([...items].sort((a, b) => Number(b.escalated) - Number(a.escalated)));
        setError('');
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Sin conexión con el servidor.'); });
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [isAdmin]);

  const review = async (incident: Incident, payload: { decision: 'CONFIRMADA'; action: ReviewAction } | { decision: 'DESCARTADA'; reason?: string }) => {
    setBusyId(incident.id);
    try {
      await reglasLabService.reviewIncident(incident.id, payload);
      setPending(current => current.filter(item => item.id !== incident.id));
      setDiscarding(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la validación.');
    } finally {
      setBusyId(null);
    }
  };

  if (pending.length === 0 && !error) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-red-500/60 bg-[#16181e] shadow-2xl shadow-black/60">
        <button
          onClick={() => setOpen(value => !value)}
          className="flex w-full items-center justify-between gap-2 rounded-t-lg bg-red-950/60 px-3 py-2 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
            <BellRing className="h-4 w-4 animate-pulse" />
            Alertas por validar ({pending.length})
            {pending.some(item => item.escalated) && (
              <span className="rounded bg-amber-500 px-1.5 text-[10px] font-bold text-black">
                {pending.filter(item => item.escalated).length} sin respuesta
              </span>
            )}
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
        </button>

        {open && (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto p-2">
            {error && <p role="alert" className="px-1 text-[11px] text-amber-400">{error}</p>}
            {pending.map(incident => (
              <div key={incident.id} className={`space-y-1.5 rounded border-l-4 p-2 text-xs ${incident.escalated ? 'border-amber-400 bg-amber-950/30' : 'border-red-500 bg-red-950/20'}`}>
                {incident.escalated && (
                  <p className="text-[10px] font-bold text-amber-300">
                    Sin respuesta hace {Math.floor((incident.pending_seconds ?? 0) / 60)} min{isAdmin ? ' · aviso al administrador' : ' · se avisó al administrador'}
                  </p>
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className="flex items-center gap-1 font-bold text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {incident.title}
                  </p>
                  <span className="shrink-0 rounded border border-red-500/30 bg-red-500/20 px-1.5 text-[10px] font-bold text-red-300">{incident.severity}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {incident.faults.map((fault, index) => (
                    <span key={fault.id ?? index} className="rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-200">
                      Falta {fault.equipment_name ?? fault.equipment_id}{fault.rule_code ? ` · ${fault.rule_code}` : ''}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-300">
                  {incident.workshop_name} · {incident.camera_name} · {new Date(incident.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>

                {discarding?.id === incident.id ? (
                  <div className="space-y-1">
                    <input
                      autoFocus
                      maxLength={300}
                      value={discarding.reason}
                      onChange={event => setDiscarding({ id: incident.id, reason: event.target.value })}
                      placeholder="Motivo (opcional), p. ej. lleva guantes transparentes"
                      className="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1 text-[11px] text-white outline-none focus:border-gray-500"
                    />
                    <div className="flex gap-1">
                      <button disabled={busyId === incident.id} onClick={() => void review(incident, { decision: 'DESCARTADA', reason: discarding.reason })}
                        className="flex-1 rounded bg-gray-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-gray-500 disabled:opacity-50">
                        Confirmar descarte
                      </button>
                      <button onClick={() => setDiscarding(null)} className="rounded border border-gray-700 px-2 py-1 text-[11px] text-gray-300 hover:bg-gray-800">Volver</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {incident.faults.some(fault => fault.has_capture) && (
                      <button onClick={() => setCaptura(incident)} className="flex items-center gap-1 rounded border border-gray-600 px-2 py-1 text-[11px] text-gray-200 hover:bg-gray-800">
                        <ImageIcon className="h-3 w-3" /> Ver evidencias ({incident.faults.filter(fault => fault.has_capture).length})
                      </button>
                    )}
                    <button disabled={busyId === incident.id} onClick={() => void review(incident, { decision: 'CONFIRMADA', action: 'CORREGIDO' })}
                      className="flex items-center gap-1 rounded bg-emerald-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                      title="La falta era real y se corrigió en el momento">
                      <CheckCircle2 className="h-3 w-3" /> Confirmar: corregido
                    </button>
                    <button disabled={busyId === incident.id} onClick={() => void review(incident, { decision: 'CONFIRMADA', action: 'RETIRADO_DE_PRACTICA' })}
                      className="rounded bg-red-700 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                      title="La falta era real y la persona fue retirada de la práctica">
                      Confirmar: retirado
                    </button>
                    <button disabled={busyId === incident.id} onClick={() => setDiscarding({ id: incident.id, reason: '' })}
                      className="flex items-center gap-1 rounded border border-gray-600 px-2 py-1 text-[11px] text-gray-300 hover:bg-gray-800 disabled:opacity-50"
                      title="Falsa alarma: no se guarda la imagen">
                      <XCircle className="h-3 w-3" /> Descartar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {captura && <CapturaModal incident={captura} onClose={() => setCaptura(null)} />}
    </>
  );
}
