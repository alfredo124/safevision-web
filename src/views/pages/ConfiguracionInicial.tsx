import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';

const input = 'w-full px-3 py-2 text-xs bg-[#eef3fe] border border-blue-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

/**
 * Configuración inicial: solo aparece la primera vez que se usa el sistema, mientras no exista un
 * administrador. Crea el administrador general; él registra después los locales, los laboratorios
 * y los demás usuarios. Cuando ya hay administrador, el backend la rechaza y aquí se va al login.
 */
export function ConfiguracionInicialPage() {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(true);
  const [form, setForm] = useState({ full_name: '', dni: '', phone: '', email: '', username: '', password: '', confirmar: '' });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    authService.needsSetup()
      .then(needs => (needs ? setVerificando(false) : navigate('/login', { replace: true })))
      .catch(() => { setVerificando(false); setError('No se pudo conectar con el servidor.'); });
  }, [navigate]);

  const cambiar = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(actual => ({ ...actual, [campo]: e.target.value }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden.'); return; }
    if (form.dni && !/^\d{8}$/.test(form.dni)) { setError('El DNI debe tener 8 dígitos.'); return; }
    setGuardando(true);
    const respuesta = await authService.setupFirstAdmin({
      username: form.username.trim(),
      password: form.password,
      full_name: form.full_name.trim(),
      dni: form.dni.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
    });
    setGuardando(false);
    if (respuesta.success) navigate('/usuarios?bienvenida=1', { replace: true });
    else setError(respuesta.message ?? 'No se pudo crear el administrador.');
  };

  if (verificando) {
    return <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-gray-500">Comprobando el sistema...</div>;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center overflow-y-auto bg-slate-50 px-4 py-6 font-sans">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded bg-[#cc002b] px-3 py-1 text-xl font-black tracking-tighter text-white">UTP</div>
        <h1 className="text-2xl font-extrabold tracking-tight text-black">SafeVision AQP</h1>
      </div>

      <div className="w-full max-w-md overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
        <div className="h-1.5 bg-[#2b72b8]" />
        <form onSubmit={enviar} className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-[#2b72b8]" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800">Configuración inicial</h2>
              <p className="text-xs text-gray-500">
                Crea el <strong>administrador general</strong>. Esta pantalla solo aparece la primera vez. Después, el
                administrador registra los locales, los laboratorios y los usuarios; los demás solo ingresan con las
                credenciales que él les entregue.
              </p>
            </div>
          </div>

          {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-2.5 text-center text-xs text-red-600">{error}</p>}

          <fieldset className="space-y-3">
            <legend className="mb-1 text-xs font-bold text-gray-700">Datos personales</legend>
            <label className="block space-y-1 text-xs font-semibold text-gray-700">
              <span>Nombres y apellidos *</span>
              <input required minLength={3} maxLength={120} value={form.full_name} onChange={cambiar('full_name')} className={input} autoComplete="name" />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold text-gray-700">
                <span>DNI</span>
                <input inputMode="numeric" maxLength={8} value={form.dni} onChange={cambiar('dni')} className={input} />
              </label>
              <label className="block space-y-1 text-xs font-semibold text-gray-700">
                <span>Celular</span>
                <input type="tel" maxLength={20} value={form.phone} onChange={cambiar('phone')} className={input} autoComplete="tel" />
              </label>
            </div>
            <label className="block space-y-1 text-xs font-semibold text-gray-700">
              <span>Correo</span>
              <input type="email" maxLength={120} value={form.email} onChange={cambiar('email')} className={input} autoComplete="email" />
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="mb-1 text-xs font-bold text-gray-700">Cuenta</legend>
            <label className="block space-y-1 text-xs font-semibold text-gray-700">
              <span>Usuario para iniciar sesión *</span>
              <input required minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" title="Letras, números, punto, guion o guion bajo"
                value={form.username} onChange={cambiar('username')} className={input} autoComplete="username" />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold text-gray-700">
                <span>Contraseña * (mín. 8)</span>
                <input required type="password" minLength={8} maxLength={72} value={form.password} onChange={cambiar('password')} className={input} autoComplete="new-password" />
              </label>
              <label className="block space-y-1 text-xs font-semibold text-gray-700">
                <span>Repetir contraseña *</span>
                <input required type="password" minLength={8} maxLength={72} value={form.confirmar} onChange={cambiar('confirmar')} className={input} autoComplete="new-password" />
              </label>
            </div>
          </fieldset>

          <button type="submit" disabled={guardando}
            className="w-full rounded-full bg-[#3179c3] py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#2563a6] disabled:opacity-50">
            {guardando ? 'CREANDO...' : 'CREAR ADMINISTRADOR Y ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
}
