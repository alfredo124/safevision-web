// src/hooks/useAuth.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import type { LoginCredentials, UserSession } from '../services/authService';

export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserSession | null>(() => authService.getCurrentUser());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    setError(null);

    if (!credentials.usuario.trim() || !credentials.password.trim()) {
      setError('Por favor, ingresa el usuario y la contraseña.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(credentials);
      if (response.success && response.user) {
        setUser(response.user);
        navigate('/');
      } else {
        setError(response.message || 'Error de autenticación');
      }
    } catch {
      setError('Error al conectar con el servicio.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    navigate('/login');
  };

  return { user, loading, error, login, logout };
}