import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Building2, Calendar, Eye, FileText, Loader2, RefreshCw } from 'lucide-react';
import { ReportePDFModal } from '../components/ReportePDFModal';
import { reglasLabService, type IncidentReport, type Workshop } from '../../services/reglasLabService';
import { usuariosService, type Local } from '../../services/usuariosService';
import { useServerChanges } from '../../services/changeEvents';
import { duracion, fechaHora, periodo, porcentaje } from '../../services/formatoReporte';

/** Fecha local en formato del input date (AAAA-MM-DD). */
const fechaInput = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

const hoy = new Date();
const INICIO_MES = fechaInput(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
const HOY = fechaInput(hoy);

/** Inicio del primer día y fin del último, en la hora local del navegador (con zona, en ISO). */
function periodoLocal(desde: string, hasta: string) {
  const start = new Date(`${desde}T00:00:00`);
  const end = new Date(`${hasta}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function ReportesPage() {
  const [fechaInicio, setFechaInicio] = useState(INICIO_MES);
  const [fechaFin, setFechaFin] = useState(HOY);
  const [campusId, setCampusId] = useState<number | ''>('');
  const [workshopId, setWorkshopId] = useState<number | ''>('');
  const [responsable, setResponsable] = useState('Comité de Seguridad y Salud en el Trabajo');

  const [locales, setLocales] = useState<Local[]>([]);
  const [laboratorios, setLaboratorios] = useState<Workshop[]>([]);
  const [reporte, setReporte] = useState<IncidentReport | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const fechasValidas = fechaInicio !== '' && fechaFin !== '' && fechaInicio <= fechaFin;

  useEffect(() => {
    reglasLabService.getConfiguration().then(config => setLaboratorios(config.workshops)).catch(() => undefined);
    usuariosService.listarLocales().then(lista => setLocales(lista.filter(local => local.is_active))).catch(() => undefined);
  }, []);

  const laboratoriosDelLocal = useMemo(
    () => (campusId === '' ? laboratorios : laboratorios.filter(lab => lab.campus_id === campusId)),
    [laboratorios, campusId],
  );

  const generar = useCallback(async () => {
    if (!fechasValidas) return;
    setCargando(true);
    setError(null);
    try {
      const datos = await reglasLabService.getReport({
        ...periodoLocal(fechaInicio, fechaFin),
        campus_id: campusId === '' ? undefined : campusId,
        workshop_id: workshopId === '' ? undefined : workshopId,
      });
      setReporte(datos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el reporte.');
    } finally {
      setCargando(false);
    }
  }, [fechasValidas, fechaInicio, fechaFin, campusId, workshopId]);

  // Primer reporte al abrir la página (mes actual, todos los laboratorios visibles). El estado
  // solo cambia al llegar la respuesta; `cargando` empieza en true.
  useEffect(() => {
    let vigente = true;
    reglasLabService.getReport(periodoLocal(INICIO_MES, HOY))
      .then(datos => { if (vigente) setReporte(datos); })
      .catch(err => { if (vigente) setError(err instanceof Error ? err.message : 'No se pudo generar el reporte.'); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  // Si llegan o se validan incidencias mientras se mira el reporte, se recalcula con los mismos filtros.
  useServerChanges(['incidents'], () => { if (reporte) void generar(); });

  const resumen = reporte?.summary;
  // Los textos salen del reporte generado, no de los filtros que se estén editando.
  const nombreLocal = reporte?.filters.campus_name ?? 'Todos los locales';
  const nombreLaboratorio = reporte?.filters.workshop_name ?? 'Todos los laboratorios';

  const inputClass = 'w-full bg-gray-900 border border-gray-700 text-gray-200 p-2 rounded text-xs focus:border-red-500 focus:outline-none';

  return (
    <div className="flex flex-1 flex-col h-full bg-[#0d0e12] text-white p-3 md:p-6 overflow-y-auto space-y-4 md:space-y-6">
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-lg md:text-2xl font-bold uppercase tracking-wide text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-red-500" /> Generador de Reportes SST
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Elige el periodo y los laboratorios. El reporte se calcula con las prácticas (sesiones) guardadas, sus alertas y su validación.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Filtros */}
        <div className="lg:col-span-1 bg-[#16181e] p-4 md:p-5 rounded-lg border border-gray-800 space-y-4">
          <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider border-b border-gray-800 pb-2">
            Parámetros del reporte
          </h2>

          <div className="space-y-2">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Periodo evaluado
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-gray-500">Desde</span>
                <input type="date" value={fechaInicio} max={fechaFin || undefined}
                  onChange={e => setFechaInicio(e.target.value)} className={inputClass} />
              </div>
              <div>
                <span className="text-[10px] text-gray-500">Hasta</span>
                <input type="date" value={fechaFin} min={fechaInicio || undefined}
                  onChange={e => setFechaFin(e.target.value)} className={inputClass} />
              </div>
            </div>
            {!fechasValidas && <p className="text-[11px] text-amber-400">La fecha inicial debe ser anterior o igual a la final.</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Local
            </label>
            <select value={campusId} className={inputClass}
              onChange={e => { setCampusId(e.target.value === '' ? '' : Number(e.target.value)); setWorkshopId(''); }}>
              <option value="">Todos los locales</option>
              {locales.map(local => <option key={local.id} value={local.id}>{local.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Laboratorio</label>
            <select value={workshopId} className={inputClass}
              onChange={e => setWorkshopId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Todos los laboratorios</option>
              {laboratoriosDelLocal.map(lab => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400">Responsable SST (aparece en el documento)</label>
            <input type="text" value={responsable} onChange={e => setResponsable(e.target.value)} className={inputClass} />
          </div>

          <div className="pt-2 space-y-2">
            <button onClick={() => void generar()} disabled={!fechasValidas || cargando}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold p-2.5 rounded text-xs transition-colors">
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Generar reporte</span>
            </button>
            <button onClick={() => setShowPreviewModal(true)} disabled={!reporte || cargando}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-700 text-gray-200 font-semibold p-2.5 rounded text-xs transition-colors">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>Ver documento / Guardar PDF</span>
            </button>
          </div>
        </div>

        {/* Resumen en pantalla */}
        <div className="lg:col-span-2 bg-[#16181e] p-4 md:p-6 rounded-lg border border-gray-800 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-950/40 border border-red-800 text-red-200 text-xs p-3 rounded">
              <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{error}</span>
            </div>
          )}
          {!reporte && !error && (
            <p className="text-xs text-gray-400 flex items-center gap-2">
              {cargando && <Loader2 className="w-4 h-4 animate-spin" />} Calculando el reporte…
            </p>
          )}
          {reporte && resumen && (
            <>
              <div className="flex flex-wrap justify-between gap-2 border-b border-gray-800 pb-3 text-xs">
                <div>
                  <p className="font-mono text-indigo-400 font-bold">{reporte.report_id}</p>
                  <p className="text-gray-400">{nombreLocal} · {nombreLaboratorio}</p>
                </div>
                <p className="text-gray-400 self-end">{periodo(reporte.start, reporte.end)}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                <Kpi valor={resumen.sessions} etiqueta="Prácticas (sesiones)" color="text-indigo-300" />
                <Kpi valor={duracion(resumen.supervised_seconds)} etiqueta="Tiempo supervisado" color="text-indigo-300" />
                <Kpi valor={resumen.alerts} etiqueta="Alertas" />
                <Kpi valor={resumen.confirmed} etiqueta="Confirmadas" color="text-red-400" />
                <Kpi valor={resumen.discarded} etiqueta="Falsas alarmas" color="text-gray-300" />
                <Kpi valor={resumen.pending} etiqueta="Sin validar" color={resumen.pending ? 'text-amber-400' : 'text-gray-300'} />
                <Kpi valor={porcentaje(resumen.precision)} etiqueta="Alertas acertadas" color="text-emerald-400" />
                <Kpi valor={duracion(resumen.avg_response_seconds)} etiqueta="Tiempo medio de respuesta" />
              </div>

              {resumen.alerts === 0 && resumen.sessions === 0 ? (
                <p className="text-xs text-gray-400">No hubo prácticas ni alertas en este periodo para los laboratorios elegidos.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[420px]">
                    <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
                      <tr>
                        <th className="py-2 pr-2">Laboratorio</th>
                        <th className="py-2 px-2 text-right">Prácticas</th>
                        <th className="py-2 px-2 text-right">Alertas</th>
                        <th className="py-2 px-2 text-right">Confirmadas</th>
                        <th className="py-2 px-2 text-right">Sin validar</th>
                        <th className="py-2 pl-2 text-right">Respuesta media</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/70">
                      {reporte.workshops.filter(lab => lab.alerts > 0 || lab.sessions > 0).map(lab => (
                        <tr key={lab.workshop_id}>
                          <td className="py-2 pr-2 text-gray-200">{lab.name}</td>
                          <td className="py-2 px-2 text-right">{lab.sessions} <span className="text-gray-500">({duracion(lab.supervised_seconds)})</span></td>
                          <td className="py-2 px-2 text-right">{lab.alerts}</td>
                          <td className="py-2 px-2 text-right">{lab.confirmed}</td>
                          <td className="py-2 px-2 text-right">{lab.pending}</td>
                          <td className="py-2 pl-2 text-right">{duracion(lab.avg_response_seconds)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Prácticas del periodo: qué se hizo, cuándo y cuánto duró */}
      {reporte && reporte.sessions.length > 0 && (
        <div className="bg-[#16181e] p-4 md:p-6 rounded-lg border border-gray-800 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-800 pb-2">
            <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Prácticas en el periodo</h2>
            <p className="text-xs text-gray-400">
              {reporte.sessions.length} prácticas · <span className="text-indigo-300 font-semibold">{duracion(reporte.summary.supervised_seconds)}</span> en total
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[560px]">
              <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="py-2 pr-2">Práctica</th>
                  <th className="py-2 px-2">Laboratorio</th>
                  <th className="py-2 px-2">Inicio</th>
                  <th className="py-2 px-2">Fin</th>
                  <th className="py-2 px-2 text-right">Duración</th>
                  <th className="py-2 pl-2 text-right">Alertas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/70">
                {reporte.sessions.map(sesion => (
                  <tr key={sesion.id}>
                    <td className="py-2 pr-2 font-mono text-indigo-400">{sesion.code}</td>
                    <td className="py-2 px-2 text-gray-200">{sesion.workshop_name}</td>
                    <td className="py-2 px-2 whitespace-nowrap">{fechaHora(sesion.started_at)}</td>
                    <td className="py-2 px-2 whitespace-nowrap">
                      {sesion.ended_at ? fechaHora(sesion.ended_at) : <span className="text-emerald-400">En curso</span>}
                      {sesion.end_reason === 'INTERRUMPIDA' && <span className="block text-[10px] text-amber-400">Interrumpida</span>}
                    </td>
                    <td className="py-2 px-2 text-right">{duracion(sesion.supervised_seconds)}</td>
                    <td className="py-2 pl-2 text-right">{sesion.alerts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reporte && (
        <ReportePDFModal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          reporte={reporte}
          encabezado={{ responsable, local: nombreLocal, laboratorios: nombreLaboratorio }}
        />
      )}
    </div>
  );
}

function Kpi({ valor, etiqueta, color = 'text-white' }: { valor: string | number; etiqueta: string; color?: string }) {
  return (
    <div className="bg-gray-900/70 border border-gray-800 rounded p-2.5 md:p-3">
      <p className={`text-lg md:text-xl font-extrabold ${color}`}>{valor}</p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight">{etiqueta}</p>
    </div>
  );
}
