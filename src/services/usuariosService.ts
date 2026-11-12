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

  /** Cambia el local de un laboratorio. */
  asignarLocal: (workshopId: number, campusId: number | null) =>
    pedir<unknown>(`/modules/reglas_lab/workshops/${workshopId}`, json('PATCH', { campus_id: campusId })),
};
