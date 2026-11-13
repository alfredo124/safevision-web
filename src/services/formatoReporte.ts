/** Formato de los datos del reporte SST (página Reportes y documento para imprimir). */

/** Segundos como "45 s", "3 min 20 s" o "2 h 5 min"; "—" si no hay dato. */
export function duracion(segundos: number | null | undefined): string {
  if (segundos === null || segundos === undefined) return '—';
  if (segundos < 60) return `${segundos} s`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return segundos % 60 ? `${minutos} min ${segundos % 60} s` : `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  return minutos % 60 ? `${horas} h ${minutos % 60} min` : `${horas} h`;
}

/** Proporción 0-1 como porcentaje con un decimal; "—" si no hay dato. */
export const porcentaje = (valor: number | null | undefined) =>
  valor === null || valor === undefined ? '—' : `${(valor * 100).toFixed(1).replace(/\.0$/, '')}%`;

/** Fecha y hora local en formato peruano (dd/mm/aaaa hh:mm). */
export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

export const hora = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });

export const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Periodo [start, end) del reporte como días locales: "01/11/2026 al 12/11/2026". */
export const periodo = (start: string, end: string) =>
  `${fecha(start)} al ${fecha(new Date(new Date(end).getTime() - 1).toISOString())}`;

/** Fecha local en formato del input date (AAAA-MM-DD), no en UTC. */
export const fechaInput = (valor: Date) =>
  `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;

/** Inicio del primer día y fin del último (AAAA-MM-DD), en la hora local del navegador, como ISO con zona.
 *  Es el formato de periodo que esperan /report, /reports, /incidents y la bitácora. */
export function periodoLocal(desde: string, hasta: string) {
  const start = new Date(`${desde}T00:00:00`);
  const end = new Date(`${hasta}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
