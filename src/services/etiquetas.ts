/**
 * Nombres en español para valores internos que llegan del backend o del modelo.
 * Nunca mostrar el valor interno en pantalla: pasarlo por estas funciones.
 */

/** Estado de conexión de una cámara (`status` del backend). */
const ESTADO_CAMARA: Record<string, string> = {
  online: 'En línea',
  offline: 'Sin conexión',
};

/** Clases del modelo de EPP (best.pt) y de personas. */
const CLASE_MODELO: Record<string, string> = {
  gloves: 'Guantes',
  goggles: 'Lentes',
  lab_coat: 'Bata',
  person: 'Persona',
};

/** Roles de usuario. */
const ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  ENCARGADO_QUIMICA: 'Encargado de Química',
  ENCARGADO_FISICA: 'Encargado de Física',
};

export const estadoCamara = (estado: string) => ESTADO_CAMARA[estado] ?? estado;
export const claseModelo = (clase: string) => CLASE_MODELO[clase] ?? clase;
export const nombreRol = (rol: string) => ROL[rol] ?? rol;

/** EPP presente pero mal puesto (falta leve): detalle que envía el motor. */
const DETALLE_FALTA: Record<string, string> = {
  BATA_ABIERTA: 'bata abierta',
  LENTES_MAL_PUESTOS: 'lentes fuera de los ojos',
};
export const detalleFalta = (detalle: string) => DETALLE_FALTA[detalle] ?? detalle;
/** Texto corto para una falta: "Falta X" o "X: bata abierta". */
export const textoFalta = (equipo: string, detalle?: string | null) =>
  detalle ? `${equipo}: ${detalleFalta(detalle)}` : `Falta ${equipo}`;
