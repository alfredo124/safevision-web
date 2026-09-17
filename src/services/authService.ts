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

// Base de datos simulada
const MOCK_USERS: Array<UserSession & { passwordHash: string }> = [
  {
    email: 'docente.lab@utp.edu.pe',
    passwordHash: '12345678',
    campus: 'Arequipa - Parra',
    role: 'Docente Supervisor SST',
    token: 'jwt-token-docente-001',
  },
  {
    email: 'supervisor.sst@utp.edu.pe',
    passwordHash: 'admin123',
    campus: 'Arequipa - Cerro Colorado',
    role: 'Coordinador General SST',
    token: 'jwt-token-supervisor-002',
  },
  {
    email: 'admin.lab@utp.edu.pe',
    passwordHash: 'utp2026',
    campus: 'Lima Centro',
    role: 'Administrador de Sistema',
    token: 'jwt-token-admin-003',
  },
];

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const foundUser = MOCK_USERS.find(
      (u) =>
        u.email.toLowerCase() === credentials.usuario.toLowerCase().trim() &&
        u.passwordHash === credentials.password
    );

    if (foundUser) {
      const { passwordHash, ...userSession } = foundUser;
      userSession.campus = credentials.campus;

      localStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
      return { success: true, user: userSession };
    }

    return {
      success: false,
      message: 'Credenciales incorrectas. Verifique su correo UTP o contraseña.',
    };
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
    await new Promise((resolve) => setTimeout(resolve, 300));
    localStorage.removeItem(SESSION_KEY);
  },
};