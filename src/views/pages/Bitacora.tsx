import { useCallback, useEffect, useRef, useState } from 'react';
import { Calendar, Filter, History, Loader2, RefreshCw } from 'lucide-react';
import { usuariosService, type AreaBitacora, type RegistroBitacora } from '../../services/usuariosService';
import { fechaHora, fechaInput, periodoLocal } from '../../services/formatoReporte';

/** Nombre de cada área de la bitácora. */
const AREAS: Record<AreaBitacora, string> = {
  usuarios: 'Usuarios y accesos',
  locales: 'Locales',
  laboratorios: 'Laboratorios y reglas',
  camaras: 'Cámaras',
  practicas: 'Prácticas',
  incidencias: 'Alertas',
  reportes: 'Reportes',
};

/** Texto de cada acción (el servidor guarda un código corto). */
const ACCIONES: Record<string, string> = {
  CREAR_ADMIN_INICIAL: 'Creó el administrador inicial',
  INICIAR_SESION: 'Inició sesión',
  INICIO_SESION_FALLIDO: 'Intento de acceso fallido',
  CREAR_USUARIO: 'Creó un usuario',
  EDITAR_USUARIO: 'Editó un usuario',
  DESACTIVAR_USUARIO: 'Desactivó un usuario',
  CREAR_LOCAL: 'Creó un local',
  EDITAR_LOCAL: 'Editó un local',
  DESACTIVAR_LOCAL: 'Desactivó un local',
  CREAR_LABORATORIO: 'Creó un laboratorio',
  EDITAR_LABORATORIO: 'Editó un laboratorio',
  CONFIGURAR_LABORATORIO: 'Cambió cámaras / EPP exigido',
  CREAR_EPP: 'Añadió un EPP al catálogo',
  CREAR_CAMARA: 'Registró una cámara',
  ELIMINAR_CAMARA: 'Eliminó una cámara',
  INICIAR_PRACTICA: 'Inició una práctica',
  FINALIZAR_PRACTICA: 'Finalizó una práctica',
  CONFIRMAR_ALERTA: 'Confirmó una alerta',
  DESCARTAR_ALERTA: 'Descartó una alerta',
  CREAR_INCIDENCIA_MANUAL: 'Registró una incidencia manual',
  EMITIR_REPORTE: 'Emitió un reporte SST',
};

/** Acciones que conviene resaltar al revisar la bitácora. */
const RESALTAR = new Set(['INICIO_SESION_FALLIDO', 'DESACTIVAR_USUARIO', 'ELIMINAR_CAMARA', 'DESCARTAR_ALERTA']);

const LIMITE = 500;
const campo = 'bg-gray-900 border border-gray-700 text-gray-200 px-2 py-1 rounded focus:outline-none';

/**
 * Bitácora (solo el administrador general): quién hizo qué, cuándo y desde qué equipo.
 * Los datos los registra el servidor al guardar cada cambio (app/core/bitacora.py); aquí solo se consultan.
 */
export function BitacoraPage() {
  // Por defecto, los últimos 7 días (hoy incluido).
  const [desde, setDesde] = useState(() => {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 6);
    return fechaInput(inicio);
  });
  const [hasta, setHasta] = useState(() => fechaInput(new Date()));
  const [area, setArea] = useState<AreaBitacora | ''>('');
  const [registros, setRegistros] = useState<RegistroBitacora[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fechasValidas = desde !== '' && hasta !== '' && desde <= hasta;

  // Solo se aplica la respuesta de la última consulta (los filtros pueden cambiar mientras tanto).
  const ultimaConsulta = useRef(0);
  const cargar = useCallback(() => {
    if (!fechasValidas) return;
    const consulta = ++ultimaConsulta.current;
    usuariosService.bitacora({ ...periodoLocal(desde, hasta), module: area || undefined, limit: LIMITE })
      .then(datos => {
        if (consulta !== ultimaConsulta.current) return;
        setRegistros(datos);
        setError(null);
      })
      .catch((err: unknown) => {
        if (consulta === ultimaConsulta.current) setError(err instanceof Error ? err.message : 'No se pudo cargar la bitácora.');
      })
      .finally(() => { if (consulta === ultimaConsulta.current) setCargando(false); });
  }, [fechasValidas, desde, hasta, area]);

  // Al abrir la página y cada vez que cambian los filtros.
  useEffect(() => { cargar(); }, [cargar]);

  /** Botón "Actualizar": muestra el indicador mientras llega la respuesta. */
  const actualizar = () => {
    setCargando(true);
    cargar();
  };

  return (
    <div className="flex flex-1 flex-col h-full bg-[#0d0e12] text-white p-3 md:p-6 overflow-y-auto space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-lg md:text-2xl font-bold uppercase tracking-wide flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-400" /> Bitácora
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Quién hizo qué y cuándo: accesos, usuarios, laboratorios y reglas, cámaras, prácticas, validación de alertas y reportes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-[#16181e] p-2.5 rounded-lg border border-gray-800 text-xs">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <input type="date" value={desde} max={hasta || undefined} onChange={e => setDesde(e.target.value)} className={campo} aria-label="Desde" />
          <span className="text-gray-500">a</span>
          <input type="date" value={hasta} min={desde || undefined} onChange={e => setHasta(e.target.value)} className={campo} aria-label="Hasta" />
          <Filter className="w-4 h-4 text-indigo-400 md:ml-2" />
          <select value={area} onChange={e => setArea(e.target.value as AreaBitacora | '')} className={campo} aria-label="Área">
            <option value="">Todas las áreas</option>
            {Object.entries(AREAS).map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
          <button onClick={actualizar} disabled={cargando || !fechasValidas} title="Actualizar"
            className="flex items-center gap-1 rounded border border-gray-700 px-2 py-1 text-gray-200 hover:bg-gray-800 disabled:opacity-50">
            {cargando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!fechasValidas && <p className="text-xs text-amber-400">La fecha inicial debe ser anterior o igual a la final.</p>}
      {error && <p role="alert" className="rounded border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</p>}
      {registros.length >= LIMITE && (
        <p className="text-xs text-amber-300">Se muestran las {LIMITE} acciones más recientes. Acorta las fechas o elige un área para ver el resto.</p>
      )}

      <div className="bg-[#16181e] rounded-lg border border-gray-800 overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[720px]">
          <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-800">
            <tr>
              <th className="p-3">Fecha y hora</th>
              <th className="p-3">Usuario</th>
              <th className="p-3">Área</th>
              <th className="p-3">Acción</th>
              <th className="p-3">Detalle</th>
              <th className="p-3">Equipo (IP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {!cargando && registros.length === 0 && (
              <tr><td colSpan={6} className="p-4 text-gray-400">No hay acciones registradas en este periodo.</td></tr>
            )}
            {registros.map(registro => (
              <tr key={registro.id} className="hover:bg-gray-800/30">
                <td className="p-3 whitespace-nowrap text-gray-300">{fechaHora(registro.timestamp)}</td>
                <td className="p-3 text-gray-200">{registro.user_name ?? '—'}</td>
                <td className="p-3 text-gray-400">{AREAS[registro.module] ?? registro.module}</td>
                <td className={`p-3 font-semibold ${RESALTAR.has(registro.action) ? 'text-amber-300' : 'text-gray-200'}`}>
                  {ACCIONES[registro.action] ?? registro.action}
                </td>
                <td className="p-3 text-gray-400 break-words max-w-md">{registro.description ?? '—'}</td>
                <td className="p-3 font-mono text-gray-500 whitespace-nowrap">{registro.ip_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
