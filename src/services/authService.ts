// src/services/authService.ts
import { API_BASE as API_URL } from './apiConfig';

export interface UserSession {
  /** Nombre de usuario con el que se inicia sesión. */
  email: string;
  role: string;
  token: string;
  full_name?: string;
  /** Local del laboratorio asignado; vacío para el administrador general. */
  campus_name?: string | null;
  workshop_name?: string | null;
}

export interface LoginCredentials {
  usuario: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  message?: string;
}

/** Datos del primer administrador general (pantalla de configuración inicial). */
export interface FirstAdmin {
  username: string;
  password: string;
  full_name: string;
  dni?: string;
  phone?: string;
  email?: string;
}

interface LoginPayload {
  access_token: string;
  user: { email: string; role: string; full_name?: string; campus_name?: string | null; workshop_name?: string | null };
}

const SESSION_KEY = 'safevision_session';

function saveSession(data: LoginPayload): UserSession {
  const session: UserSession = {
    email: data.user.email,
    role: data.user.role,
    token: data.access_token,
    full_name: data.user.full_name,
    campus_name: data.user.campus_name ?? null,
    workshop_name: data.user.workshop_name ?? null,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/modules/auth_db/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: credentials.usuario, password: credentials.password }),
      });
      const data = await response.json();
      if (response.ok) return { success: true, user: saveSession(data as LoginPayload) };
      return { success: false, message: data.detail || 'Credenciales incorrectas.' };
    } catch {
      return { success: false, message: 'Error al conectar con el servidor.' };
    }
  },

  /** true si todavía no hay administrador: hay que mostrar la configuración inicial. */
  needsSetup: async (): Promise<boolean> => {
    const response = await fetch(`${API_URL}/modules/auth_db/setup`);
    if (!response.ok) throw new Error('No se pudo consultar el estado del sistema.');
    return ((await response.json()) as { needs_setup: boolean }).needs_setup;
  },

  /** Crea el administrador general (solo la primera vez) y deja la sesión iniciada. */
  setupFirstAdmin: async (admin: FirstAdmin): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/modules/auth_db/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admin),
      });
      const data = await response.json();
      if (response.ok) return { success: true, user: saveSession(data as LoginPayload) };
      return { success: false, message: data.detail || 'No se pudo crear el administrador.' };
    } catch {
      return { success: false, message: 'Error al conectar con el servidor.' };
    }
  },

  getCurrentUser: (): UserSession | null => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('safevision:logout'));  // corta la transmisión de la estación, si la hay
  },
};
