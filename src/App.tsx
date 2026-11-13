import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Importaciones desde la subcarpeta views/
import { MainLayout } from './views/layouts/MainLayout';
import { LoginPage } from './views/pages/Login';
import { MonitoreoPage } from './views/pages/Monitoreo';
import { ConfigReglasPage } from './views/pages/ConfigReglas';
import { IncidenciasPage } from './views/pages/Incidencias';
import { ReportesPage } from './views/pages/Reportes';
import { EstacionCamaraPage } from './views/pages/EstacionCamara';
import { UsuariosPage } from './views/pages/Usuarios';
import { ConfiguracionInicialPage } from './views/pages/ConfiguracionInicial';
import { BitacoraPage } from './views/pages/Bitacora';
import { authService } from './services/authService';

function ProtectedRoutes() {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

/** Solo el administrador general: los demás vuelven a Monitoreo. */
function AdminRoutes() {
  return authService.getCurrentUser()?.role === 'ADMINISTRADOR' ? <Outlet /> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Solo la primera vez (sin administrador); si ya existe, la página manda al login. */}
        <Route path="/configuracion-inicial" element={<ConfiguracionInicialPage />} />

        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<MonitoreoPage />} />
            <Route path="reglas" element={<ConfigReglasPage />} />
            <Route path="incidencias" element={<IncidenciasPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="estacion" element={<EstacionCamaraPage />} />
            <Route element={<AdminRoutes />}>
              <Route path="usuarios" element={<UsuariosPage />} />
              <Route path="bitacora" element={<BitacoraPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}