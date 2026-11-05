import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { reglasLabService, type Incident, type IncidentFault } from '../../services/reglasLabService';

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

  const title = `Falta: ${fault.equipment_name ?? fault.equipment_id ?? 'EPP'}${fault.rule_code ? ` (${fault.rule_code})` : ''}`;
  return (
    <figure className="space-y-1">
      <figcaption className="flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-red-300">{title}</span>
        <span className="text-gray-400">
          {new Date(fault.detected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · {fault.severity}
        </span>
      </figcaption>
      {!fault.has_capture && <p className="text-[11px] text-gray-500">Sin captura (descartada o no se pudo guardar).</p>}
      {error && <p role="alert" className="text-[11px] text-red-300">{error}</p>}
      {fault.has_capture && !url && !error && <p className="text-[11px] text-gray-400">Cargando captura...</p>}
      {url && <img src={url} alt={title} className="max-h-[60vh] w-auto rounded" />}
    </figure>
  );
}

/** Evidencias de una alerta: una captura por cada EPP faltante, con rostros cubiertos. */
export function CapturaModal({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  return (
    <div role="dialog" aria-label={`Evidencias ${incident.code}`} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-lg border border-gray-700 bg-[#16181e] p-3" onClick={event => event.stopPropagation()}>
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
    </div>
  );
}
