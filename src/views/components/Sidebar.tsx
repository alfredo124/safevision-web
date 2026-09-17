import React from 'react';
import { NavLink } from 'react-router-dom';
import { Radio, Settings, Clock, FileText } from 'lucide-react';

export function Sidebar() {
  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
      isActive
        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-transparent'
    }`;

  return (
    <aside className="w-60 shrink-0 bg-[#16181e] border-r border-gray-800 p-4">
      <nav className="space-y-3">
        <NavLink to="/" className={linkStyle}>
          <Radio className="w-4 h-4 animate-pulse" />
          Monitoreo en Vivo
          <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-bold ml-auto">
            ACTIVO
          </span>
        </NavLink>

        <NavLink to="/reglas" className={linkStyle}>
          <Settings className="w-4 h-4" />
          Configurar Reglas
        </NavLink>

        <NavLink to="/incidencias" className={linkStyle}>
          <Clock className="w-4 h-4" />
          Historial de Incidencias
        </NavLink>

        <NavLink to="/reportes" className={linkStyle}>
          <FileText className="w-4 h-4" />
          Reportes SST
        </NavLink>
      </nav>
    </aside>
  );
}