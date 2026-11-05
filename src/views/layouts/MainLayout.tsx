import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { AlertasPanel } from '../components/AlertasPanel';
import { EstacionActiva } from '../components/EstacionActiva';

export function MainLayout() {
  return (
    // h-dvh: en el celular descuenta la barra del navegador (h-screen la tapaba).
    <div className="flex flex-col w-screen h-dvh bg-[#111318] text-gray-200 font-sans select-none overflow-hidden">
      <Header />

      {/* Este dispositivo transmite su cámara: se ve en todas las páginas, con botón para detener. */}
      <EstacionActiva />

      {/* Alertas pendientes de validación, en todas las páginas.
          Celular: acordeón bajo la cabecera (no tapa las cámaras). Escritorio: panel flotante. */}
      <AlertasPanel />

      {/* Celular: el menú queda abajo (flex-col-reverse). Escritorio: menú lateral. */}
      <div className="flex flex-1 flex-col-reverse md:flex-row overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden bg-[#0d0e12]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
