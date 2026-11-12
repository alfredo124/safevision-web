import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { IncidentReport, ReportIncident, ReportSession } from '../../services/reglasLabService';
import { SEVERITY_STYLES } from '../../services/severity';
import { accionRevision, estadoIncidencia, textoFalta } from '../../services/etiquetas';
import { duracion, fechaHora, hora, periodo, porcentaje } from '../../services/formatoReporte';

interface Encabezado {
  responsable: string;
  local: string;
  laboratorios: string;
}

interface ReportePDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  reporte: IncidentReport;
  encabezado: Encabezado;
}

/** Colores de impresión por gravedad (fondo claro). */
const GRAVEDAD_PAPEL: Record<string, string> = {
  'CRÍTICO': 'bg-red-100 text-red-700',
  ALTO: 'bg-amber-100 text-amber-700',
  MEDIO: 'bg-yellow-100 text-yellow-800',
};
const ESTADO_PAPEL: Record<string, string> = {
  CONFIRMADA: 'bg-red-50 text-red-700',
  ATENDIDO: 'bg-red-50 text-red-700',
  DESCARTADA: 'bg-gray-100 text-gray-600',
  PENDIENTE: 'bg-amber-50 text-amber-700',
  EN_REVISION: 'bg-amber-50 text-amber-700',
};

const th = 'p-1.5 border border-slate-800 font-semibold';
const td = 'p-1.5 align-top';

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-5 break-inside-avoid-page">
      <h2 className="text-xs font-bold text-red-600 uppercase border-l-4 border-red-600 pl-2 mb-2.5 tracking-wide">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ valor, etiqueta, color = 'text-gray-900' }: { valor: string | number; etiqueta: string; color?: string }) {
  return (
    <div className="border border-gray-200 bg-gray-50 p-2 rounded text-center">
      <p className={`text-base font-extrabold ${color}`}>{valor}</p>
      <p className="text-[8.5px] font-bold text-gray-500 uppercase tracking-wider leading-tight">{etiqueta}</p>
    </div>
  );
}

const faltasTexto = (incidencia: ReportIncident) =>
  incidencia.faults.map(f => textoFalta(f.equipment_name ?? 'EPP', f.detail) + (f.rule_code ? ` (${f.rule_code})` : '')).join('; ');

function TablaIncidencias({ incidencias, conLaboratorio }: { incidencias: ReportIncident[]; conLaboratorio: boolean }) {
  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[600px] text-left border-collapse text-[9.5px] print:min-w-0">
        <thead>
          <tr className="bg-slate-900 text-white uppercase text-[8.5px]">
            <th className={th}>Código</th>
            <th className={th}>{conLaboratorio ? 'Fecha / hora' : 'Hora'}</th>
            <th className={th}>{conLaboratorio ? 'Laboratorio / cámara' : 'Cámara'}</th>
            <th className={th}>Faltas detectadas</th>
            <th className={th}>Gravedad</th>
            <th className={th}>Estado</th>
            <th className={th}>Validación</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {incidencias.map((inc, i) => (
            <tr key={inc.id} className={`break-inside-avoid ${i % 2 ? 'bg-gray-50' : ''}`}>
              <td className={`${td} font-mono font-bold whitespace-nowrap`}>{inc.code}</td>
              <td className={`${td} whitespace-nowrap`}>{conLaboratorio ? fechaHora(inc.occurred_at) : hora(inc.occurred_at)}</td>
              <td className={td}>
                {conLaboratorio ? <>{inc.workshop_name}<span className="block text-gray-500">{inc.camera_name}</span></> : inc.camera_name}
              </td>
              <td className={td}>{faltasTexto(inc)}</td>
              <td className={td}>
                <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[8px] ${GRAVEDAD_PAPEL[inc.severity] ?? ''}`}>
                  {SEVERITY_STYLES[inc.severity]?.label ?? inc.severity}
                </span>
              </td>
              <td className={td}>
                <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] ${ESTADO_PAPEL[inc.status] ?? ''}`}>
                  {estadoIncidencia(inc.status)}
                </span>
                {inc.action_taken && <span className="block mt-0.5 text-gray-600">{accionRevision(inc.action_taken)}</span>}
              </td>
              <td className={td}>
                {inc.reviewed_by_name ?? '—'}
                {inc.response_seconds !== null && <span className="block text-gray-500">en {duracion(inc.response_seconds)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const finPractica = (sesion: ReportSession) =>
  sesion.ended_at ? fechaHora(sesion.ended_at) : 'en curso';

export function ReportePDFModal({ isOpen, onClose, reporte, encabezado }: ReportePDFModalProps) {
  if (!isOpen) return null;

  const { summary: resumen } = reporte;
  const conAlertas = reporte.workshops.filter(lab => lab.alerts > 0);
  const cronologicas = [...reporte.incidents].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  const porPractica = (id: number) => cronologicas.filter(inc => inc.session_id === id);
  const fueraDePractica = cronologicas.filter(inc => inc.session_id === null);
  const horasTotales = reporte.sessions.reduce((total, sesion) => total + sesion.supervised_seconds, 0);

  return createPortal(
    <div id="reporte-sst-modal" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:backdrop-blur-none print:overflow-visible">
      <div className="sticky top-0 z-10 flex justify-end gap-2 p-3 print:hidden">
        <div className="flex items-center gap-2 bg-[#16181e] p-2 rounded-lg border border-gray-700 shadow-xl">
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded transition-colors">
            <Printer className="w-4 h-4" />
            <span>Imprimir / Guardar PDF</span>
          </button>
          <button onClick={onClose} aria-label="Cerrar" className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hoja A4: en el celular se desplaza a lo ancho dentro de las tablas */}
      <div className="px-2 pb-6 sm:px-4 print:p-0">
        <article className="bg-white text-gray-900 w-full max-w-[794px] mx-auto p-4 sm:p-8 shadow-2xl font-sans text-xs print:max-w-none print:shadow-none print:p-0">
          {/* ENCABEZADO INSTITUCIONAL */}
          <header className="flex flex-wrap justify-between items-start gap-3 border-b-2 border-red-600 pb-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-red-600 text-white font-extrabold px-3 py-1.5 rounded text-lg tracking-wider">UTP</div>
              <div>
                <h1 className="text-sm font-bold uppercase tracking-tight">Universidad Tecnológica del Perú</h1>
                <p className="text-[11px] font-semibold text-gray-600">Reporte de cumplimiento de EPP en laboratorios (SST)</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-gray-500 space-y-0.5">
              <p><strong className="text-gray-700">Reporte:</strong> {reporte.report_id}</p>
              <p><strong className="text-gray-700">Emitido:</strong> {fechaHora(reporte.generated_at)}</p>
              <p><strong className="text-gray-700">Generado por:</strong> {reporte.generated_by}</p>
            </div>
          </header>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] print:grid-cols-2">
            <p><span className="text-gray-500">Periodo evaluado:</span> <strong>{periodo(reporte.start, reporte.end)}</strong></p>
            <p><span className="text-gray-500">Local:</span> <strong>{encabezado.local}</strong></p>
            <p><span className="text-gray-500">Laboratorios:</span> <strong>{encabezado.laboratorios}</strong></p>
            <p><span className="text-gray-500">Responsable SST:</span> <strong>{encabezado.responsable || '—'}</strong></p>
            <p><span className="text-gray-500">Sistema:</span> <strong>SafeVision (detección de EPP por visión artificial)</strong></p>
            <p><span className="text-gray-500">Normativa de referencia:</span> <strong>Ley N° 29783</strong></p>
          </div>

          <Seccion titulo="1. Resumen del periodo">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 print:grid-cols-4">
              <Dato valor={resumen.sessions} etiqueta="Prácticas (sesiones)" color="text-indigo-700" />
              <Dato valor={duracion(resumen.supervised_seconds)} etiqueta="Tiempo supervisado" color="text-indigo-700" />
              <Dato valor={resumen.alerts} etiqueta="Alertas generadas" />
              <Dato valor={resumen.confirmed} etiqueta="Confirmadas" color="text-red-600" />
              <Dato valor={resumen.discarded} etiqueta="Falsas alarmas" color="text-gray-600" />
              <Dato valor={resumen.pending} etiqueta="Sin validar" color={resumen.pending ? 'text-amber-600' : 'text-gray-900'} />
              <Dato valor={porcentaje(resumen.precision)} etiqueta="Alertas acertadas" color="text-emerald-700" />
              <Dato valor={duracion(resumen.avg_response_seconds)} etiqueta="Tiempo medio de respuesta" />
            </div>
            <p className="mt-2 text-[10px] text-gray-600 leading-relaxed">
              {resumen.faults} faltas de EPP. Por gravedad: {SEVERITY_STYLES['CRÍTICO'].label} {resumen.faults_by_severity['CRÍTICO']},
              {' '}{SEVERITY_STYLES.ALTO.label} {resumen.faults_by_severity.ALTO},
              {' '}{SEVERITY_STYLES.MEDIO.label} {resumen.faults_by_severity.MEDIO}
              {resumen.minor_faults > 0 && ` (de ellas, ${resumen.minor_faults} por EPP mal puesto)`}.
              Acciones al confirmar: {resumen.actions.CORREGIDO} corregidas en el momento y {resumen.actions.RETIRADO_DE_PRACTICA} retiros de la práctica.
              {resumen.alerts_outside_sessions > 0 && ` ${resumen.alerts_outside_sessions} alertas se registraron fuera de una práctica (datos anteriores a las sesiones o registro manual).`}
              {' '}«Alertas acertadas» es la proporción de alertas confirmadas entre las validadas; el tiempo de respuesta va desde la alerta hasta su validación.
            </p>
          </Seccion>

          <Seccion titulo="2. Resultados por laboratorio">
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[560px] text-left border-collapse text-[10px] print:min-w-0">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[8.5px]">
                    <th className={th}>Laboratorio</th>
                    <th className={th}>EPP obligatorio</th>
                    <th className={`${th} text-right`}>Prácticas</th>
                    <th className={`${th} text-right`}>Alertas</th>
                    <th className={`${th} text-right`}>Confirm.</th>
                    <th className={`${th} text-right`}>Falsas</th>
                    <th className={`${th} text-right`}>Sin validar</th>
                    <th className={`${th} text-right`}>Resp. media</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reporte.workshops.length === 0 && (
                    <tr><td colSpan={8} className={`${td} text-gray-500`}>No hay laboratorios en el alcance del reporte.</td></tr>
                  )}
                  {reporte.workshops.map((lab, i) => (
                    <tr key={lab.workshop_id} className={i % 2 ? 'bg-gray-50' : ''}>
                      <td className={`${td} font-bold`}>
                        {lab.name}
                        {lab.campus_name && <span className="block font-normal text-gray-500">{lab.campus_name}</span>}
                      </td>
                      <td className={td}>{lab.required_equipment.join(', ') || '—'}</td>
                      <td className={`${td} text-right whitespace-nowrap`}>
                        {lab.sessions}
                        {lab.sessions > 0 && <span className="block text-gray-500">{duracion(lab.supervised_seconds)}</span>}
                      </td>
                      <td className={`${td} text-right`}>{lab.alerts}</td>
                      <td className={`${td} text-right`}>{lab.confirmed}</td>
                      <td className={`${td} text-right`}>{lab.discarded}</td>
                      <td className={`${td} text-right`}>{lab.pending}</td>
                      <td className={`${td} text-right`}>{duracion(lab.avg_response_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {conAlertas.length === 0 && reporte.workshops.length > 0 && (
              <p className="mt-2 text-[10px] text-emerald-700 font-semibold">Sin alertas en el periodo.</p>
            )}
          </Seccion>

          <Seccion titulo="3. Prácticas realizadas en el periodo">
            {reporte.sessions.length === 0 ? (
              <p className="text-[10px] text-gray-500">No hubo prácticas iniciadas en el periodo.</p>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full min-w-[560px] text-left border-collapse text-[10px] print:min-w-0">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[8.5px]">
                      <th className={th}>Práctica</th>
                      <th className={th}>Laboratorio</th>
                      <th className={th}>Inicio</th>
                      <th className={th}>Fin</th>
                      <th className={`${th} text-right`}>Duración</th>
                      <th className={`${th} text-right`}>Alertas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reporte.sessions.map((sesion, i) => (
                      <tr key={sesion.id} className={`break-inside-avoid ${i % 2 ? 'bg-gray-50' : ''}`}>
                        <td className={`${td} font-mono font-bold whitespace-nowrap`}>{sesion.code}</td>
                        <td className={td}>{sesion.workshop_name}</td>
                        <td className={`${td} whitespace-nowrap`}>{fechaHora(sesion.started_at)}</td>
                        <td className={`${td} whitespace-nowrap`}>
                          {finPractica(sesion)}
                          {sesion.end_reason === 'INTERRUMPIDA' && (
                            <span className="block text-amber-700">Interrumpida (servidor apagado)</span>
                          )}
                        </td>
                        <td className={`${td} text-right`}>{duracion(sesion.supervised_seconds)}</td>
                        <td className={`${td} text-right`}>{sesion.alerts}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-900 font-bold">
                      <td className={td} colSpan={4}>Total: {reporte.sessions.length} prácticas</td>
                      <td className={`${td} text-right`}>{duracion(horasTotales)}</td>
                      <td className={`${td} text-right`}>{reporte.sessions.reduce((total, sesion) => total + sesion.alerts, 0)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-1.5 text-[9px] text-gray-500">
                  La duración cuenta solo el tiempo dentro del periodo elegido (una práctica que empezó antes o terminó después se recorta).
                </p>
              </div>
            )}
          </Seccion>

          <Seccion titulo="4. Incidencias por práctica">
            {reporte.sessions.length === 0 && fueraDePractica.length === 0 && (
              <p className="text-[10px] text-gray-500">No se registraron alertas en el periodo.</p>
            )}
            <div className="space-y-4">
              {reporte.sessions.map(sesion => {
                const incidencias = porPractica(sesion.id);
                return (
                  <div key={sesion.id} className="break-inside-avoid-page">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-gray-300 pb-1 mb-1.5 text-[10px]">
                      <p>
                        <span className="font-mono font-bold text-gray-900">{sesion.code}</span>
                        <span className="text-gray-600"> · {sesion.workshop_name}</span>
                      </p>
                      <p className="text-gray-600">
                        {fechaHora(sesion.started_at)} – {finPractica(sesion)} · {duracion(sesion.supervised_seconds)} ·{' '}
                        <strong className="text-gray-900">{sesion.alerts} {sesion.alerts === 1 ? 'alerta' : 'alertas'}</strong>
                      </p>
                    </div>
                    {incidencias.length > 0
                      ? <TablaIncidencias incidencias={incidencias} conLaboratorio={false} />
                      : <p className="text-[10px] text-emerald-700 font-semibold">Sin alertas en esta práctica.</p>}
                  </div>
                );
              })}
              {fueraDePractica.length > 0 && (
                <div className="break-inside-avoid-page">
                  <div className="border-b border-gray-300 pb-1 mb-1.5 text-[10px]">
                    <p className="font-bold text-gray-900">Alertas fuera de una práctica</p>
                    <p className="text-gray-500">Registradas antes de que existieran las sesiones o de forma manual.</p>
                  </div>
                  <TablaIncidencias incidencias={fueraDePractica} conLaboratorio />
                </div>
              )}
            </div>
            {reporte.incidents_truncated && (
              <p className="mt-2 text-[10px] text-amber-700">
                Se listan las {reporte.incidents.length} alertas más recientes; el resumen y los totales cuentan todas las del periodo.
              </p>
            )}
          </Seccion>

          {reporte.equipment.length > 0 && (
            <Seccion titulo="5. Faltas por equipo de protección">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[8.5px]">
                    <th className={th}>EPP</th>
                    <th className={`${th} text-right`}>Faltas detectadas</th>
                    <th className={`${th} text-right`}>En alertas confirmadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reporte.equipment.map((item, i) => (
                    <tr key={item.equipment_id} className={i % 2 ? 'bg-gray-50' : ''}>
                      <td className={`${td} font-bold`}>{item.name}</td>
                      <td className={`${td} text-right`}>{item.faults}</td>
                      <td className={`${td} text-right`}>{item.confirmed_faults}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Seccion>
          )}

          <Seccion titulo="Evidencia e integridad del reporte">
            <div className="bg-gray-50 border border-gray-200 rounded p-3 text-[9.5px] text-gray-700 space-y-1.5 leading-relaxed">
              <p>
                Cada alerta confirmada conserva su captura en SafeVision, con el rostro de las personas cubierto. Las falsas alarmas
                no guardan imágenes. Las capturas se consultan en la sección Incidencias con el código de la alerta.
              </p>
              <p>
                Huella SHA-256 del contenido: <code className="font-mono text-[8.5px] break-all text-gray-900">{reporte.fingerprint}</code>.
                Si se vuelve a generar el reporte del mismo periodo y la huella no coincide, alguna alerta cambió después de esta emisión.
              </p>
            </div>
          </Seccion>

          <div className="mt-12 pt-6 border-t border-gray-300 grid grid-cols-2 gap-6 sm:gap-12 text-center text-[10px] text-gray-700 break-inside-avoid">
            <div>
              <div className="border-b border-gray-400 w-full max-w-48 mx-auto mb-1" />
              <p className="font-bold">Docente / Encargado de Laboratorio</p>
            </div>
            <div>
              <div className="border-b border-gray-400 w-full max-w-48 mx-auto mb-1" />
              <p className="font-bold">Responsable de Seguridad y Salud en el Trabajo</p>
            </div>
          </div>

          <footer className="mt-8 pt-3 border-t border-gray-200 flex justify-between gap-2 text-[9px] text-gray-400">
            <p>SafeVision • Reporte {reporte.report_id}</p>
            <p>Emitido el {fechaHora(reporte.generated_at)}</p>
          </footer>
        </article>
      </div>
    </div>,
    document.body,
  );
}
