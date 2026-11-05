import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  AlertOctagon,
  FileSpreadsheet,
  Building2,
  ShieldAlert,
  Image as ImageIcon,
} from 'lucide-react';
import { reglasLabService, type Incident, type IncidentStatus, type ReviewAction } from '../../services/reglasLabService';
import { CapturaModal } from '../components/CapturaModal';

const ACTION_LABELS: Record<ReviewAction, string> = {
  CORREGIDO: 'Corregido',
  RETIRADO_DE_PRACTICA: 'Retirado de la práctica',
};
const STATUS_LABELS: Record<IncidentStatus, string> = {
  PENDIENTE: 'Pendiente de validar',
  EN_REVISION: 'En revisión',
  CONFIRMADA: 'Confirmada',
  DESCARTADA: 'Descartada',
  ATENDIDO: 'Atendido',
};

interface IncidenteHistorico {
  id: number;
  codigo: string;
  fecha: string;
  hora: string;
  workshopId: number;
  ambiente: string;
  cameraId: number;
  camara: string;
  tipo: string;
  gravedad: string;
  estado: IncidentStatus;
  detectedClass: string | null;
  confidence: number | null;
  boundingBox: Incident['bounding_box'];
  frameWidth: number | null;
  frameHeight: number | null;
  ruleCode: string | null;
  hasCapture: boolean;
  sistema: boolean;
  revisor: string | null;
  revisadoEn: string | null;
  motivo: string | null;
  accion: ReviewAction | null;
  faltas: Incident['faults'];
  raw: Incident;
}

/** Fecha AAAA-MM-DD en la hora local del equipo (no en UTC). */
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const mapIncident = (incident: Incident): IncidenteHistorico => {
  const occurredAt = new Date(incident.occurred_at);
  return {
    id: incident.id,
    codigo: incident.code,
    fecha: localDate(occurredAt),
    hora: occurredAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    workshopId: incident.workshop_id,
    ambiente: incident.workshop_name,
    cameraId: incident.camera_id,
    camara: incident.camera_name,
    tipo: incident.title,
    gravedad: incident.severity,
    estado: incident.status,
    detectedClass: incident.detected_class,
    confidence: incident.confidence,
    boundingBox: incident.bounding_box,
    frameWidth: incident.frame_width,
    frameHeight: incident.frame_height,
    ruleCode: incident.rule_code,
    hasCapture: incident.has_capture,
    sistema: incident.created_by_system,
    revisor: incident.reviewed_by_name,
    revisadoEn: incident.reviewed_at
      ? new Date(incident.reviewed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
      : null,
    motivo: incident.review_reason,
    accion: incident.action_taken,
    faltas: incident.faults,
    raw: incident,
  };
};

export function IncidenciasPage() {
  const today = localDate(new Date());
  const [fechaInicio, setFechaInicio] = useState(today);
  const [fechaFin, setFechaFin] = useState(today);
  const [ambienteFiltro, setAmbienteFiltro] = useState('TODOS');
  const [historial, setHistorial] = useState<IncidenteHistorico[]>([]);
  const [ambientes, setAmbientes] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [captura, setCaptura] = useState<Incident | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([reglasLabService.getIncidents(), reglasLabService.getConfiguration()])
      .then(([incidents, configuration]) => {
        if (!active) return;
        setHistorial(incidents.map(mapIncident));
        setAmbientes(configuration.workshops.map(workshop => ({ id: workshop.id, name: workshop.name })));
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'No se pudo cargar el historial.'); })
      .finally(() => { if (active) setIsLoading(false); });
    // Las alertas se validan también desde el panel global: se refresca cada 10 s.
    const timer = window.setInterval(() => {
      reglasLabService.getIncidents()
        .then(incidents => { if (active) setHistorial(incidents.map(mapIncident)); })
        .catch(() => { /* se reintenta */ });
    }, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const datosFiltrados = historial.filter((item) => {
    const cumpleAmbiente = ambienteFiltro === 'TODOS' || item.ambiente === ambienteFiltro;
    const cumpleFecha = item.fecha >= fechaInicio && item.fecha <= fechaFin;
    return cumpleAmbiente && cumpleFecha;
  });

  const totalIncidentes = datosFiltrados.length;
  const totalGraves = datosFiltrados.filter((i) => i.gravedad === 'CRÍTICO').length;
  const totalModerados = datosFiltrados.filter((i) => i.gravedad === 'ALTO').length;
  const totalLeves = datosFiltrados.filter((i) => i.gravedad === 'MEDIO').length;
  const incidentesPorAmbiente = ambientes.map(workshop => ({
    name: workshop.name,
    count: datosFiltrados.filter(incident => incident.workshopId === workshop.id).length,
  })).filter(item => item.count > 0);
  const incidentesPorTipo = Object.entries(datosFiltrados.reduce<Record<string, number>>((counts, incident) => {
    counts[incident.tipo] = (counts[incident.tipo] || 0) + 1;
    return counts;
  }, {})).sort((left, right) => right[1] - left[1]).slice(0, 6);
  const review = async (incidentId: number, payload: { decision: 'CONFIRMADA'; action: ReviewAction } | { decision: 'DESCARTADA' }) => {
    try {
      const updated = await reglasLabService.reviewIncident(incidentId, payload);
      setHistorial(current => current.map(item => item.id === incidentId ? mapIncident(updated) : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la validación.');
    }
  };

  const exportReport = () => {
    const rows = [
      ['Código', 'Fecha', 'Hora', 'Taller', 'Cámara', 'Incidencia', 'Regla', 'Gravedad', 'Estado', 'Validado por', 'Fecha validación', 'Acción', 'Motivo descarte'],
      ...datosFiltrados.map(row => [row.codigo, row.fecha, row.hora, row.ambiente, row.camara, row.tipo, row.faltas.map(fault => fault.rule_code).filter(Boolean).join(' '), row.gravedad, STATUS_LABELS[row.estado], row.revisor ?? '', row.revisadoEn ?? '', row.accion ? ACTION_LABELS[row.accion] : '', row.motivo ?? '']),
    ];
    const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'incidencias.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-[#0d0e12] text-white p-6 overflow-y-auto space-y-6">

      {/* Encabezado y Filtros Globales */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wide text-white">
            Historial de Incidencias
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Incidencias persistidas con cámara, taller y datos de detección disponibles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-[#16181e] p-2.5 rounded-lg border border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded focus:outline-none"
            />
            <span className="text-gray-500">a</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 border-l border-gray-700 pl-3">
            <Filter className="w-4 h-4 text-indigo-400" />
            <select
              value={ambienteFiltro}
              onChange={(e) => setAmbienteFiltro(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded focus:outline-none"
            >
              <option value="TODOS">Todos los Ambientes</option>
              {ambientes.map(workshop => <option key={workshop.id} value={workshop.name}>{workshop.name}</option>)}
            </select>
          </div>

          <button onClick={exportReport} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-3 py-1 rounded ml-auto transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Exportar Reporte</span>
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</p>}
      {isLoading && <p className="text-sm text-gray-400">Cargando incidencias...</p>}

      {/* Tarjetas KPI de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#16181e] p-4 rounded-lg border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Total Registros</p>
            <p className="text-2xl font-mono font-bold text-white mt-1">{totalIncidentes}</p>
          </div>
          <BarChart3 className="w-8 h-8 text-indigo-400 opacity-80" />
        </div>

        <div className="bg-[#16181e] p-4 rounded-lg border border-red-500/30 bg-red-950/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-red-400 uppercase font-bold">Infracciones Graves</p>
            <p className="text-2xl font-mono font-bold text-red-400 mt-1">{totalGraves}</p>
          </div>
          <AlertOctagon className="w-8 h-8 text-red-500 opacity-80" />
        </div>

        <div className="bg-[#16181e] p-4 rounded-lg border border-amber-500/30 bg-amber-950/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 uppercase font-bold">Infracciones Moderadas</p>
            <p className="text-2xl font-mono font-bold text-amber-400 mt-1">{totalModerados}</p>
          </div>
          <ShieldAlert className="w-8 h-8 text-amber-500 opacity-80" />
        </div>

        <div className="bg-[#16181e] p-4 rounded-lg border border-yellow-500/30 bg-yellow-950/10 flex items-center justify-between">
          <div>
            <p className="text-xs text-yellow-400 uppercase font-bold">Infracciones Leves</p>
            <p className="text-2xl font-mono font-bold text-yellow-400 mt-1">{totalLeves}</p>
          </div>
          <TrendingUp className="w-8 h-8 text-yellow-500 opacity-80" />
        </div>
      </div>

      {/* Reportes por Área y Tipo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#16181e] p-4 rounded-lg border border-gray-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Acumulado por Ambiente
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            {incidentesPorAmbiente.map(item => (
              <div key={item.name}>
                <div className="mb-1 flex justify-between text-gray-300">
                  <span>{item.name}</span>
                  <span className="font-mono font-bold text-emerald-400">{item.count} ({Math.round(item.count / Math.max(totalIncidentes, 1) * 100)}%)</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                  <div className="h-full bg-emerald-500" style={{ width: `${item.count / Math.max(totalIncidentes, 1) * 100}%` }} />
                </div>
              </div>
            ))}
            {incidentesPorAmbiente.length === 0 && <p className="text-gray-500">Sin incidencias en este periodo.</p>}
          </div>
        </div>

        <div className="bg-[#16181e] p-4 rounded-lg border border-gray-800 space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider">
              Tipos de Infracción Más Frecuentes
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {incidentesPorTipo.map(([title, count]) => (
              <div key={title} className="flex items-center justify-between rounded border border-gray-800 bg-gray-900/80 p-2.5">
                <span className="text-gray-300">{title}</span>
                <span className="rounded border border-indigo-500/30 bg-indigo-500/20 px-2 py-0.5 font-bold text-indigo-300">{count}</span>
              </div>
            ))}
            {incidentesPorTipo.length === 0 && <p className="text-gray-500">Sin tipos registrados.</p>}
          </div>
        </div>
      </div>

      {/* Tabla del Historial Registrado */}
      <div className="bg-[#16181e] rounded-lg border border-gray-800 shrink-0">
        <div className="p-3 bg-gray-900/60 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
            Detalle de Infracciones Registradas ({datosFiltrados.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-900/90 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Fecha / Hora</th>
                <th className="p-3">Ambiente / Cámara</th>
                <th className="p-3">Infracción Detectada</th>
                <th className="p-3">YOLO / Captura</th>
                <th className="p-3">Nivel Gravedad</th>
                <th className="p-3">Validación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {datosFiltrados.map((row) => (
                <tr key={row.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="p-3 font-mono text-indigo-400 font-semibold">{row.codigo}</td>
                  <td className="p-3 text-gray-300">{row.fecha} <span className="text-gray-500">({row.hora})</span></td>
                  <td className="p-3">
                    <p className="font-semibold text-gray-200">{row.ambiente}</p>
                    <p className="text-[10px] text-gray-500">{row.camara}</p>
                  </td>
                  <td className="p-3 font-medium text-white">
                    {row.tipo}
                    <p className="text-[10px] font-normal text-gray-500">
                      {row.faltas.map(fault => fault.rule_code).filter(Boolean).join(', ') && (
                        <span className="font-mono text-indigo-300">{row.faltas.map(fault => fault.rule_code).filter(Boolean).join(', ')}</span>
                      )}
                      {row.sistema && <span className="ml-1 rounded border border-gray-700 px-1">Sistema · por validar</span>}
                    </p>
                  </td>
                  <td className="p-3 text-[10px] text-gray-400">
                    <span>{row.detectedClass ?? 'Sin clase YOLO'}</span>
                    {row.confidence !== null && <span className="ml-1">{Math.round(row.confidence * 100)}%</span>}
                    {row.faltas.some(fault => fault.has_capture) && (
                      <button onClick={() => setCaptura(row.raw)} className="ml-1 inline-flex items-center gap-1 rounded border border-emerald-700 px-1.5 py-0.5 text-emerald-300 hover:bg-emerald-900/40">
                        <ImageIcon className="h-3 w-3" /> Evidencias ({row.faltas.filter(fault => fault.has_capture).length})
                      </button>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      row.gravedad === 'CRÍTICO'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : row.gravedad === 'ALTO'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    }`}>
                      {row.gravedad}
                    </span>
                  </td>
                  <td className="p-3 text-[10px]">
                    <p className={`font-bold ${row.estado === 'CONFIRMADA' ? 'text-red-300' : row.estado === 'DESCARTADA' ? 'text-gray-400' : 'text-amber-300'}`}>
                      {STATUS_LABELS[row.estado]}
                    </p>
                    {row.revisor && (
                      <p className="text-gray-400">
                        {row.revisor} · {row.revisadoEn}
                        {row.accion && <span className="block text-gray-300">{ACTION_LABELS[row.accion]}</span>}
                        {row.motivo && <span className="block italic">{row.motivo}</span>}
                      </p>
                    )}
                    {(row.estado === 'PENDIENTE' || row.estado === 'EN_REVISION') && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <button onClick={() => void review(row.id, { decision: 'CONFIRMADA', action: 'CORREGIDO' })} className="rounded bg-emerald-700 px-1.5 py-0.5 text-white hover:bg-emerald-600">Corregido</button>
                        <button onClick={() => void review(row.id, { decision: 'CONFIRMADA', action: 'RETIRADO_DE_PRACTICA' })} className="rounded bg-red-700 px-1.5 py-0.5 text-white hover:bg-red-600">Retirado</button>
                        <button onClick={() => void review(row.id, { decision: 'DESCARTADA' })} className="rounded border border-gray-600 px-1.5 py-0.5 text-gray-300 hover:bg-gray-800">Descartar</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {captura && <CapturaModal incident={captura} onClose={() => setCaptura(null)} />}

    </div>
  );
}