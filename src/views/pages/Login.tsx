import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { login, loading, error } = useAuth();

  const [usuario, setUsuario] = useState('docente.lab@utp.edu.pe');
  const [password, setPassword] = useState('12345678');
  const [campus, setCampus] = useState('Arequipa - Parra');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ usuario, password, campus });
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-slate-50 font-sans select-none pt-4">
      {/* Banner Superior */}
      <div className="w-full max-w-5xl px-8 mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-[#cc002b] px-4 py-1.5 rounded font-black text-white text-2xl tracking-tighter">
            UTP
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-700 font-medium leading-none">Universidad</span>
            <span className="text-xs text-gray-700 font-medium leading-tight">Tecnológica</span>
            <span className="text-xs text-gray-700 font-medium leading-none">del Perú</span>
          </div>
        </div>
      </div>

      <h1 className="text-3xl font-extrabold text-black mb-6 tracking-tight">
        SafeVision AQP
      </h1>

      {/* Card Formulario */}
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="h-1.5 bg-[#2b72b8]" />

        <div className="p-6 flex flex-col items-center">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide text-center">
            INICIAR SESIÓN AL SISTEMA
          </h2>
          <p className="text-xs text-gray-500 mb-6 text-center">
            Seguridad & Monitoreo SST
          </p>

          {error && (
            <div className="w-full mb-4 p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">
                Usuario / Correo UTP:
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="docente.lab@utp.edu.pe"
                className="w-full px-3 py-2 text-xs bg-[#eef3fe] border border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">
                Contraseña:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#eef3fe] border border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 block">
                Sede / Campus:
              </label>
              <select
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Arequipa - Parra">Arequipa - Parra</option>
                <option value="Arequipa - Cerro Colorado">Arequipa - Cerro Colorado</option>
                <option value="Lima Centro">Lima Centro</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-[#3179c3] hover:bg-[#2563a6] text-white text-xs font-bold rounded-full shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  AUTENTICANDO...
                </>
              ) : (
                'INGRESAR'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}