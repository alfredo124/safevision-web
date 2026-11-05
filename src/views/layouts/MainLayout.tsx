import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { AlertasPanel } from '../components/AlertasPanel';

export function MainLayout() {
  return (
    <div className="flex flex-col w-screen h-screen bg-[#111318] text-gray-200 font-sans select-none overflow-hidden">
      {/* Header Fijo Superior */}
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Fijo Lateral */}
        <Sidebar />

        {/* Contenido Dinámico (Equivalente al <router-outlet> de Angular) */}
        <main className="flex-1 flex overflow-hidden bg-[#0d0e12]">
          <Outlet />
        </main>
      </div>

      {/* Alertas pendientes de validación: visibles en cualquier página */}
      <AlertasPanel />
    </div>
  );
}