import React from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-[#1a1d24] border-b border-gray-800 shrink-0">
      {/* Brand / Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-[#cc002b] px-3 py-1 rounded font-black text-white text-xl tracking-tighter">
          UTP
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-400 leading-none">Universidad Tecnológica del Perú</span>
          <span className="text-lg font-bold text-white leading-tight">SafeVision AQP</span>
          <span className="text-xs text-gray-400 leading-none">Sistema de Supervisión de EPP</span>
        </div>
      </div>

      {/* Info de Usuario y Cierre de Sesión */}
      {user && (
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-sm font-semibold text-white leading-tight">
              {user.email.split('@')[0]}
            </span>
            <span className="text-xs text-gray-400 leading-tight">
              {user.role} • <span className="text-indigo-400">{user.campus}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
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