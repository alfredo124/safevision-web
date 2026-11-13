import { API_BASE } from './apiConfig';
import { authService } from './authService';
import type { LaboratoryType } from './reglasLabService';

/** Usuarios, locales (sedes) y local de cada laboratorio. Solo el administrador general escribe. */

export type Rol = 'ADMINISTRADOR' | 'ENCARGADO_QUIMICA' | 'ENCARGADO_FISICA';

export interface Usuario {
  id: number;
  username: string;
  full_name: string;
  dni: string | null;
  phone: string | null;
  email: string | null;
  role: Rol;
  is_active: boolean;
  created_at: string | null;
  workshop_id: number | null;
  workshop_name: string | null;
  laboratory_type: LaboratoryType | null;
  campus_id: number | null;
  campus_name: string | null;
}

export interface UsuarioNuevo {
  username: string;
  password: string;
  full_name: string;
  dni?: string | null;
  phone?: string | null;
  email?: string | null;
  role: Rol;
  workshop_id?: number | null;
}

export type CambiosUsuario = Partial<Omit<UsuarioNuevo, 'username'>> & { is_active?: boolean };

export interface Local {
  id: number;
  name: string;
  city: string | null;
  address: string | null;
  is_active: boolean;
  workshop_count: number;
}

export type DatosLocal = { name: string; city?: string | null; address?: string | null; is_active?: boolean };

/** Áreas de la bitácora (las mismas que app/core/bitacora.py MODULOS). */
export type AreaBitacora = 'usuarios' | 'locales' | 'laboratorios' | 'camaras' | 'practicas' | 'incidencias' | 'reportes';

/** Una acción registrada en la bitácora: quién, qué, cuándo y desde qué equipo. */
export interface RegistroBitacora {
  id: number;
  timestamp: string;
  user_id: number | null;
  user_name: string | null;
  /** Código corto, p. ej. CONFIRMAR_ALERTA. */
  action: string;
  module: AreaBitacora;
  description: string | null;
  ip_address: string | null;
}

async function pedir<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const token = authService.getCurrentUser()?.token;
  if (!token) throw new Error('Inicia sesión para continuar.');
  const response = await fetch(`${API_BASE}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) {
    const cuerpo = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(cuerpo?.detail || `Error del servidor (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const usuariosService = {
  listar: () => pedir<Usuario[]>('/modules/auth_db/users'),
  crear: (datos: UsuarioNuevo) => pedir<Usuario>('/modules/auth_db/users', json('POST', datos)),
  actualizar: (username: string, cambios: CambiosUsuario) =>
    pedir<Usuario>(`/modules/auth_db/users/${encodeURIComponent(username)}`, json('PATCH', cambios)),

  listarLocales: () => pedir<Local[]>('/modules/reglas_lab/campuses'),
  crearLocal: (datos: DatosLocal) => pedir<Local>('/modules/reglas_lab/campuses', json('POST', datos)),
  actualizarLocal: (id: number, datos: Partial<DatosLocal>) => pedir<Local>(`/modules/reglas_lab/campuses/${id}`, json('PATCH', datos)),

  /** Bitácora (solo el administrador). `start`/`end` con zona horaria. */
  bitacora: (filtros: { module?: AreaBitacora; start?: string; end?: string; limit?: number } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([clave, valor]) => { if (valor !== undefined) params.set(clave, String(valor)); });
    return pedir<RegistroBitacora[]>(`/modules/auth_db/activity${params.size ? `?${params}` : ''}`);
  },

  /** Cambia el local de un laboratorio. */
  asignarLocal: (workshopId: number, campusId: number | null) =>
    pedir<unknown>(`/modules/reglas_lab/workshops/${workshopId}`, json('PATCH', { campus_id: campusId })),
};
