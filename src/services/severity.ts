import type { Severity } from './reglasLabService';

/**
 * Colores por gravedad, iguales en toda la web (alertas, Monitoreo e Incidencias) y en los
 * recuadros del video (backend, reglas_lab/overlay.py): CRÍTICO rojo, ALTO ámbar, MEDIO amarillo.
 * Las clases van completas para que Tailwind las incluya.
 */
export interface SeverityStyle {
  /** Nombre para el encargado. */
  label: string;
  text: string;
  /** Insignia con la gravedad. */
  badge: string;
  /** Tarjeta con borde izquierdo. */
  card: string;
  /** Etiqueta pequeña, por ejemplo cada falta de una alerta. */
  chip: string;
}

export const SEVERITY_STYLES: Record<Severity, SeverityStyle> = {
  'CRÍTICO': {
    label: 'Grave',
    text: 'text-red-300',
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    card: 'border-red-500 bg-red-950/30',
    chip: 'border-red-500/40 bg-red-500/10 text-red-200',
  },
  ALTO: {
    label: 'Moderada',
    text: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    card: 'border-amber-500 bg-amber-950/30',
    chip: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  },
  MEDIO: {
    label: 'Leve',
    text: 'text-yellow-300',
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    card: 'border-yellow-500 bg-yellow-950/30',
    chip: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-200',
  },
};

const ORDER: Record<Severity, number> = { 'CRÍTICO': 3, ALTO: 2, MEDIO: 1 };

export const severityStyle = (severity: string | null | undefined): SeverityStyle =>
  SEVERITY_STYLES[(severity && severity in SEVERITY_STYLES ? severity : 'ALTO') as Severity];

/** La más grave de una lista (para el encabezado del panel de alertas). */
export const maxSeverity = (values: Severity[]): Severity | null =>
  values.reduce<Severity | null>((worst, value) => (worst === null || ORDER[value] > ORDER[worst] ? value : worst), null);

/** Colores de los recuadros del video; iguales a SEVERITY_COLORS del backend (overlay.py). */
export const SEVERITY_HEX: Record<string, string> = { 'CRÍTICO': '#ef4444', ALTO: '#f59e0b', MEDIO: '#eab308' };

/** Texto legible sobre el color de una etiqueta: blanco solo sobre rojo o verde. */
export const tagTextColor = (background: string) =>
  ['#ef4444', '#10b981'].includes(background.toLowerCase()) ? '#ffffff' : '#111827';
