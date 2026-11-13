import { NavLink } from 'react-router-dom';
import { Radio, Settings, Clock, FileText, Smartphone, PanelLeftClose, PanelLeftOpen, Users, History } from 'lucide-react';
import { useCollapsible } from '../../hooks/useCollapsible';
import { authService } from '../../services/authService';

const LINKS = [
  { to: '/', end: true, icon: Radio, label: 'Monitoreo en Vivo', short: 'Monitoreo', pulse: true },
  { to: '/estacion', icon: Smartphone, label: 'Estación de Cámara', short: 'Estación' },
  { to: '/reglas', icon: Settings, label: 'Configurar Reglas', short: 'Reglas' },
  { to: '/incidencias', icon: Clock, label: 'Historial de Incidencias', short: 'Historial' },
  { to: '/reportes', icon: FileText, label: 'Reportes SST', short: 'Reportes' },
];
// Solo para el administrador general.
const ADMIN_LINKS = [
  { to: '/usuarios', end: false, icon: Users, label: 'Usuarios y locales', short: 'Usuarios', pulse: false },
  { to: '/bitacora', end: false, icon: History, label: 'Bitácora', short: 'Bitácora', pulse: false },
];

export function Sidebar() {
  // Plegado (solo iconos) o desplegado (con nombres). En el celular en vertical es la barra inferior.
  const [collapsed, toggle] = useCollapsible('menu');
  const links = authService.getCurrentUser()?.role === 'ADMINISTRADOR' ? [...LINKS, ...ADMIN_LINKS] : LINKS;

  const linkStyle = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 md:flex-none md:w-full flex-col md:flex-row items-center gap-0.5 md:gap-3 px-1 py-1.5 md:py-2 ${collapsed ? 'md:justify-center md:px-0' : 'md:px-3'} text-[10px] md:text-sm font-medium rounded-md border transition-colors ${
      isActive
        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50 border-transparent'
    }`;

  return (
    // Celular en vertical: barra inferior con icono y nombre corto. Pantallas anchas: menú lateral plegable.
    <aside className={`shrink-0 flex md:flex-col bg-[#16181e] border-t md:border-t-0 md:border-r border-gray-800 p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:pb-2 transition-[width] ${collapsed ? 'md:w-14 md:p-2' : 'md:w-60 md:p-4 short:md:p-2'}`}>
      <nav className={`flex flex-1 md:flex-none md:block gap-1 ${collapsed ? 'md:space-y-2' : 'md:space-y-3 short:md:space-y-1'}`}>
        {links.map(({ to, end, icon: Icon, label, short, pulse }) => (
          <NavLink key={to} to={to} end={end} className={linkStyle} title={label}>
            <Icon className={`w-5 h-5 md:w-4 md:h-4 shrink-0 ${pulse ? 'animate-pulse' : ''}`} />
            <span className="md:hidden">{short}</span>
            {!collapsed && <span className="hidden md:inline">{label}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={toggle}
        title={collapsed ? 'Mostrar el menú' : 'Plegar el menú'}
        aria-label={collapsed ? 'Mostrar el menú' : 'Plegar el menú'}
        aria-expanded={!collapsed}
        className={`hidden md:flex mt-auto items-center gap-2 rounded-md px-2 py-2 text-xs text-gray-500 hover:bg-gray-800/50 hover:text-white ${collapsed ? 'justify-center' : ''}`}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Plegar menú</>}
      </button>
    </aside>
  );
}
