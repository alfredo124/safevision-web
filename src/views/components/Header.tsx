import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { nombreRol } from '../../services/etiquetas';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between gap-2 px-3 md:px-4 py-1.5 md:py-2 short:py-1 bg-[#1a1d24] border-b border-gray-800 shrink-0">
      {/* Marca y logotipo */}
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <div className="bg-[#cc002b] px-2 md:px-3 py-1 rounded font-black text-white text-base md:text-xl tracking-tighter">
          UTP
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="hidden md:block short:hidden text-xs text-gray-400 leading-none">Universidad Tecnológica del Perú</span>
          <span className="truncate text-base md:text-lg font-bold text-white leading-tight">SafeVision AQP</span>
          <span className="hidden md:block short:hidden text-xs text-gray-400 leading-none">Sistema de Supervisión de EPP</span>
        </div>
      </div>

      {/* Info de Usuario y Cierre de Sesión */}
      {user && (
        <div className="flex shrink-0 items-center gap-2 md:gap-4">
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-white leading-tight">
              {user.full_name ?? user.email}
            </span>
            <span className="hidden md:inline short:hidden text-xs text-gray-400 leading-tight">
              {nombreRol(user.role)} • <span className="text-indigo-400">{user.role === 'ADMINISTRADOR' ? 'Todos los locales' : user.campus_name ?? 'Sin local asignado'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:block short:hidden p-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
              <User className="w-5 h-5" />
            </div>

            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors ml-1"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}