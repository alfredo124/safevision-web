import { useEffect, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { reglasLabService, type Incident, type IncidentFault, type ReviewAction } from '../../services/reglasLabService';
import { severityStyle } from '../../services/severity';
import { textoFalta } from '../../services/etiquetas';

export type Validacion = { decision: 'CONFIRMADA'; action: ReviewAction } | { decision: 'DESCARTADA'; reason?: string };

/** Una evidencia: la captura de una falta, con su título (qué EPP falta y qué regla). */
function Evidencia({ incidentId, fault }: { incidentId: number; fault: IncidentFault }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!fault.has_capture) return;
    let objectUrl: string | null = null;
    let active = true;
    reglasLabService.getIncidentCaptureUrl(incidentId, fault.id)
      .then(value => {
        objectUrl = value;
        if (active) setUrl(value);
        else URL.revokeObjectURL(value);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar la captura.'); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [incidentId, fault.id, fault.has_capture]);

  const title = `${textoFalta(fault.equipment_name ?? fault.equipment_id ?? 'EPP', fault.detail)}${fault.rule_code ? ` (${fault.rule_code})` : ''}`;
  return (
    <figure className="space-y-1">
      <figcaption className="flex items-center justify-between gap-2 text-xs">
        <span className={`font-bold ${severityStyle(fault.severity).text}`}>{title}</span>
        <span className="text-gray-400">
          {new Date(fault.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {severityStyle(fault.severity).label}
        </span>
      </figcaption>
      {!fault.has_capture && <p className="text-[11px] text-gray-500">Sin captura (descartada o no se pudo guardar).</p>}
      {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
      {fault.has_capture && !url && !error && <p className="text-[11px] text-gray-400">Cargando captura...</p>}
      {url && <img src={url} alt={title} className="max-h-[60vh] w-auto rounded" />}
    </figure>
  );
}

/**
 * Evidencias de una alerta: una captura por cada EPP faltante, con rostros cubiertos.
 * Con `onReview`, la alerta se valida aquí mismo: la ventana queda fija en esta alerta aunque
 * lleguen otras nuevas, así no hay que cerrarla y buscar cuál era.
 */
export function CapturaModal({ incident, onClose, onReview }: {
  incident: Incident;
  onClose: () => void;
  /** Devuelve true si se guardó; entonces la ventana se cierra. */
  onReview?: (incident: Incident, validacion: Validacion) => Promise<boolean>;
}) {
  const [motivo, setMotivo] = useState<string | null>(null);  // null: no se está descartando
  const [ocupado, setOcupado] = useState(false);
  const pendiente = incident.status === 'PENDIENTE' || incident.status === 'EN_REVISION';

  const validar = async (validacion: Validacion) => {
    if (!onReview) return;
    setOcupado(true);
    const ok = await onReview(incident, validacion);
    setOcupado(false);
    if (ok) onClose();
  };

  return (
    <div role="dialog" aria-label={`Evidencias ${incident.code}`} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-2 md:p-4" onClick={onClose}>
      <div className="flex max-h-[92dvh] max-w-4xl flex-col overflow-hidden rounded-lg border border-gray-700 bg-[#16181e]" onClick={event => event.stopPropagation()}>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-gray-200">{incident.code}: {incident.title}</p>
            <p className="text-[11px] text-gray-400">{incident.workshop_name} · {incident.camera_name} · {incident.faults.length} evidencia(s), rostros cubiertos</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-400 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          {incident.faults.map((fault, index) => (
            <Evidencia key={fault.id ?? `legacy-${index}`} incidentId={incident.id} fault={fault} />
          ))}
        </div>
        <p className="mt-3 text-[11px] text-gray-400">Detección automática: confírmala comprobando en el laboratorio.</p>
        </div>

        {onReview && pendiente && (
          // Barra fija abajo: siempre visible aunque las capturas sean largas.
          <div className="shrink-0 border-t border-gray-700 bg-[#111318] p-2">
            {motivo !== null ? (
              <div className="flex flex-wrap gap-1">
                <input autoFocus maxLength={300} value={motivo} onChange={event => setMotivo(event.target.value)}
                  placeholder="Motivo (opcional), p. ej. lleva guantes transparentes"
                  className="min-w-0 flex-1 rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-xs text-white outline-none focus:border-gray-500" />
                <button disabled={ocupado} onClick={() => void validar({ decision: 'DESCARTADA', reason: motivo })}
                  className="rounded bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-500 disabled:opacity-50">Confirmar descarte</button>
                <button onClick={() => setMotivo(null)} className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800">Volver</button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-auto text-[11px] text-gray-400">Validar {incident.code}:</span>
                <button disabled={ocupado} onClick={() => void validar({ decision: 'CONFIRMADA', action: 'CORREGIDO' })}
                  title="La falta era real y se corrigió en el momento"
                  className="flex items-center gap-1 rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar: corregido
                </button>
                <button disabled={ocupado} onClick={() => void validar({ decision: 'CONFIRMADA', action: 'RETIRADO_DE_PRACTICA' })}
                  title="La falta era real y la persona fue retirada de la práctica"
                  className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50">Confirmar: retirado</button>
                <button disabled={ocupado} onClick={() => setMotivo('')} title="Falsa alarma: no se guarda la imagen"
                  className="flex items-center gap-1 rounded border border-gray-600 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-50">
                  <XCircle className="h-3.5 w-3.5" /> Descartar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
