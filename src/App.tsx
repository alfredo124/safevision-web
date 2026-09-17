import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

// Importaciones desde la subcarpeta views/
import { MainLayout } from './views/layouts/MainLayout';
import { LoginPage } from './views/pages/Login';
import { MonitoreoPage } from './views/pages/Monitoreo';
import { ConfigReglasPage } from './views/pages/ConfigReglas';
import { IncidenciasPage } from './views/pages/Incidencias';
import { ReportesPage } from './views/pages/Reportes';
import { authService } from './services/authService';

function ProtectedRoutes() {
  const currentUser = authService.getCurrentUser();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<MonitoreoPage />} />
            <Route path="reglas" element={<ConfigReglasPage />} />
            <Route path="incidencias" element={<IncidenciasPage />} />
            <Route path="reportes" element={<ReportesPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}