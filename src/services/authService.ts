// src/services/authService.ts
export interface UserSession {
  email: string;
  campus: string;
  role: string;
  token: string;
}

export interface LoginCredentials {
  usuario: string;
  password: string;
  campus: string;
}

export interface AuthResponse {
  success: boolean;
  user?: UserSession;
  message?: string;
}

const SESSION_KEY = 'safevision_session';
const API_URL = 'http://localhost:8000'; // Ajusta según la URL de tu backend

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/modules/auth_db/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: credentials.usuario,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Asumiendo que el backend retorna el token y datos del usuario
        const userSession: UserSession = {
          email: data.user?.email || credentials.usuario,
          campus: credentials.campus,
          role: data.user?.role || 'USER',
          token: data.access_token,
        };

        localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
        return { success: true, user: userSession };
      }

      return {
        success: false,
        message: data.detail || 'Credenciales incorrectas.',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error al conectar con el servidor.',
      };
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
  },
};
