import React from 'react';
import { NavLink } from 'react-router-dom';
import { Radio, Settings, Clock, FileText, Smartphone } from 'lucide-react';

const LINKS = [
  { to: '/', end: true, icon: Radio, label: 'Monitoreo en Vivo', short: 'Monitoreo', pulse: true },
  { to: '/estacion', icon: Smartphone, label: 'Estación de Cámara', short: 'Estación' },
  { to: '/reglas', icon: Settings, label: 'Configurar Reglas', short: 'Reglas' },
  { to: '/incidencias', icon: Clock, label: 'Historial de Incidencias', short: 'Historial' },
  { to: '/reportes', icon: FileText, label: 'Reportes SST', short: 'Reportes' },
];

export function Sidebar() {
  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 md:flex-none md:w-full flex-col md:flex-row items-center gap-0.5 md:gap-3 px-1 md:px-3 py-1.5 md:py-2 text-[10px] md:text-sm font-medium rounded-md border transition-colors ${
      isActive
        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-transparent'
    }`;

  return (
    // Celular: barra inferior con icono y nombre corto. Escritorio: menú lateral.
    <aside className="shrink-0 bg-[#16181e] border-t md:border-t-0 md:border-r border-gray-800 p-1 md:p-4 md:w-60 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:pb-4">
      <nav className="flex md:block gap-1 md:space-y-3">
        {LINKS.map(({ to, end, icon: Icon, label, short, pulse }) => (
          <NavLink key={to} to={to} end={end} className={linkStyle} title={label}>
            <Icon className={`w-5 h-5 md:w-4 md:h-4 shrink-0 ${pulse ? 'animate-pulse' : ''}`} />
            <span className="md:hidden">{short}</span>
            <span className="hidden md:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
