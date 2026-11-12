import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, Pencil, Plus, Power, UserPlus, Users, X } from 'lucide-react';
import { reglasLabService, type Workshop } from '../../services/reglasLabService';
import { usuariosService, type Local, type Rol, type Usuario } from '../../services/usuariosService';
import { nombreRol } from '../../services/etiquetas';
import { authService } from '../../services/authService';

const campo = 'w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500';
const etiqueta = 'block space-y-1 text-xs text-gray-300';
const AREA: Record<string, string> = { QUIMICA: 'Química', FISICA: 'Física' };

/** Administración (solo el administrador general): usuarios con sus datos, laboratorio y local; locales de la universidad. */
export function UsuariosPage() {
  const [params, setParams] = useSearchParams();
  const [pestana, setPestana] = useState<'usuarios' | 'locales'>('usuarios');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [laboratorios, setLaboratorios] = useState<Workshop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [editando, setEditando] = useState<Usuario | 'nuevo' | null>(null);
  const bienvenida = params.get('bienvenida') === '1';

  // Cada cambio sube la versión y se vuelven a pedir los datos.
  const [version, setVersion] = useState(0);
  const cargar = useCallback(async () => setVersion(v => v + 1), []);

  useEffect(() => {
    let activo = true;
    Promise.all([usuariosService.listar(), usuariosService.listarLocales(), reglasLabService.getConfiguration()])
      .then(([u, l, configuracion]) => {
        if (!activo) return;
        setUsuarios(u);
        setLocales(l);
        setLaboratorios(configuracion.workshops);
        setError(null);
      })
      .catch(e => { if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.'); });
    return () => { activo = false; };
  }, [version]);

  const avisar = (texto: string) => { setAviso(texto); window.setTimeout(() => setAviso(null), 4000); };

  const cambiarEstado = async (usuario: Usuario) => {
    try {
      await usuariosService.actualizar(usuario.username, { is_active: !usuario.is_active });
      avisar(usuario.is_active ? `${usuario.full_name} ya no puede ingresar.` : `${usuario.full_name} puede ingresar de nuevo.`);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado.');
    }
  };

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-3 text-white md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-emerald-400" /> Usuarios y locales</h1>
        <div className="flex rounded border border-gray-800 bg-gray-900/60 p-1 text-xs">
          {(['usuarios', 'locales'] as const).map(id => (
            <button key={id} onClick={() => setPestana(id)}
              className={`rounded px-3 py-1 font-semibold ${pestana === id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {id === 'usuarios' ? 'Usuarios' : 'Locales y laboratorios'}
            </button>
          ))}
        </div>
      </div>

      {bienvenida && (
        <div className="flex items-start justify-between gap-3 rounded border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-200">
          <p>
            <strong>Administrador general creado.</strong> Siguientes pasos: 1) registra los locales de la universidad,
            2) asigna cada laboratorio a su local y 3) crea las cuentas de los encargados.
          </p>
          <button onClick={() => { params.delete('bienvenida'); setParams(params, { replace: true }); }} aria-label="Cerrar aviso" className="text-emerald-300 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {error && <p role="alert" className="rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
      {aviso && <p className="flex items-center gap-2 rounded border border-emerald-800 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> {aviso}</p>}

      {pestana === 'usuarios' ? (
        <ListaUsuarios usuarios={usuarios} onNuevo={() => setEditando('nuevo')} onEditar={setEditando} onEstado={u => void cambiarEstado(u)} />
      ) : (
        <LocalesYLaboratorios locales={locales} laboratorios={laboratorios} onCambio={async texto => { avisar(texto); await cargar(); }} onError={setError} />
      )}

      {editando && (
        <FormularioUsuario
          usuario={editando === 'nuevo' ? null : editando}
          laboratorios={laboratorios}
          onCerrar={() => setEditando(null)}
          onGuardado={async texto => { setEditando(null); avisar(texto); await cargar(); }}
        />
      )}
    </div>
  );
}

function ListaUsuarios({ usuarios, onNuevo, onEditar, onEstado }: {
  usuarios: Usuario[];
  onNuevo: () => void;
  onEditar: (usuario: Usuario) => void;
  onEstado: (usuario: Usuario) => void;
}) {
  const yo = authService.getCurrentUser()?.email;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-400">Solo el administrador general crea cuentas. Cada encargado ve únicamente su laboratorio.</p>
        <button onClick={onNuevo} className="flex items-center gap-2 rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold hover:bg-emerald-500">
          <UserPlus className="h-4 w-4" /> Nuevo usuario
        </button>
      </div>
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-900/80 text-[11px] uppercase tracking-wider text-gray-400">
            <tr>
              <th className="p-2">Nombre</th><th className="p-2">Rol</th><th className="p-2">Laboratorio · local</th>
              <th className="p-2">Contacto</th><th className="p-2">Estado</th><th className="p-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {usuarios.map(usuario => (
              <tr key={usuario.id} className={usuario.is_active ? '' : 'opacity-50'}>
                <td className="p-2"><p className="font-semibold">{usuario.full_name}</p><p className="text-xs text-gray-500">{usuario.username}{usuario.dni ? ` · DNI ${usuario.dni}` : ''}</p></td>
                <td className="p-2 text-xs">{usuario.role === 'ADMINISTRADOR' ? 'Administrador general' : nombreRol(usuario.role)}</td>
                <td className="p-2 text-xs">
                  {usuario.role === 'ADMINISTRADOR' ? <span className="text-gray-500">Todos los locales</span> : (
                    <><p>{usuario.workshop_name ?? <span className="text-amber-400">Sin laboratorio</span>}</p>
                      <p className="text-gray-500">{usuario.campus_name ?? 'Sin local'}</p></>
                  )}
                </td>
                <td className="p-2 text-xs text-gray-400"><p>{usuario.phone ?? '—'}</p><p>{usuario.email ?? ''}</p></td>
                <td className="p-2 text-xs">{usuario.is_active ? <span className="text-emerald-400">Activo</span> : <span className="text-gray-400">Desactivado</span>}</td>
                <td className="p-2">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onEditar(usuario)} title="Editar" aria-label={`Editar ${usuario.full_name}`} className="rounded border border-gray-700 p-1.5 hover:bg-gray-800"><Pencil className="h-3.5 w-3.5" /></button>
                    {usuario.username !== yo && (
                      <button onClick={() => onEstado(usuario)} title={usuario.is_active ? 'Desactivar' : 'Activar'}
                        aria-label={`${usuario.is_active ? 'Desactivar' : 'Activar'} ${usuario.full_name}`}
                        className={`rounded border p-1.5 ${usuario.is_active ? 'border-red-900 text-red-300 hover:bg-red-950/40' : 'border-emerald-800 text-emerald-300 hover:bg-emerald-950/40'}`}>
                        <Power className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-sm text-gray-500">Sin usuarios.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FormularioUsuario({ usuario, laboratorios, onCerrar, onGuardado }: {
  usuario: Usuario | null;
  laboratorios: Workshop[];
  onCerrar: () => void;
  onGuardado: (texto: string) => void;
}) {
  const nuevo = usuario === null;
  const [datos, setDatos] = useState({
    full_name: usuario?.full_name ?? '', dni: usuario?.dni ?? '', phone: usuario?.phone ?? '', email: usuario?.email ?? '',
    username: usuario?.username ?? '', password: '',
    tipo: (usuario?.role === 'ADMINISTRADOR' ? 'admin' : 'encargado') as 'admin' | 'encargado',
    workshop_id: usuario?.workshop_id ?? null as number | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (clave: keyof typeof datos) => (e: React.ChangeEvent<HTMLInputElement>) => setDatos(d => ({ ...d, [clave]: e.target.value }));

  // Laboratorios agrupados por local para elegir el del encargado.
  const grupos = useMemo(() => {
    const mapa = new Map<string, Workshop[]>();
    laboratorios.forEach(lab => {
      const local = lab.campus_name ?? 'Sin local asignado';
      mapa.set(local, [...(mapa.get(local) ?? []), lab]);
    });
    return [...mapa.entries()];
  }, [laboratorios]);
  const laboratorio = laboratorios.find(lab => lab.id === datos.workshop_id) ?? null;

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (datos.dni && !/^\d{8}$/.test(datos.dni)) { setError('El DNI debe tener 8 dígitos.'); return; }
    if (datos.tipo === 'encargado' && !laboratorio) { setError('Elige el laboratorio del encargado.'); return; }
    if (nuevo && datos.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }
    if (!nuevo && datos.password && datos.password.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    // El rol del encargado (Química o Física) sale del tipo de su laboratorio.
    const role: Rol = datos.tipo === 'admin' ? 'ADMINISTRADOR' : laboratorio!.laboratory_type === 'FISICA' ? 'ENCARGADO_FISICA' : 'ENCARGADO_QUIMICA';
    const comunes = {
      full_name: datos.full_name.trim(), dni: datos.dni.trim() || null, phone: datos.phone.trim() || null,
      email: datos.email.trim() || null, role, workshop_id: datos.tipo === 'admin' ? null : laboratorio!.id,
    };
    setGuardando(true);
    try {
      if (nuevo) {
        await usuariosService.crear({ ...comunes, username: datos.username.trim(), password: datos.password });
        onGuardado(`Usuario ${datos.username.trim()} creado. Entrégale su usuario y contraseña.`);
      } else {
        await usuariosService.actualizar(usuario.username, { ...comunes, ...(datos.password ? { password: datos.password } : {}) });
        onGuardado(datos.password ? `Datos y contraseña de ${comunes.full_name} actualizados.` : `Datos de ${comunes.full_name} actualizados.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-label={nuevo ? 'Nuevo usuario' : 'Editar usuario'}>
      <form onSubmit={enviar} className="max-h-full w-full max-w-lg space-y-4 overflow-y-auto rounded border border-gray-700 bg-[#16181e] p-4 text-white shadow-2xl md:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">{nuevo ? 'Nuevo usuario' : `Editar: ${usuario.full_name}`}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar formulario" className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        {error && <p role="alert" className="rounded border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}

        <fieldset className="space-y-3">
          <legend className="text-xs font-bold uppercase tracking-wider text-gray-400">Datos personales</legend>
          <label className={etiqueta}><span>Nombres y apellidos *</span><input required minLength={3} maxLength={120} value={datos.full_name} onChange={cambiar('full_name')} className={campo} /></label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className={etiqueta}><span>DNI</span><input inputMode="numeric" maxLength={8} value={datos.dni} onChange={cambiar('dni')} className={campo} /></label>
            <label className={`${etiqueta} sm:col-span-2`}><span>Celular</span><input type="tel" maxLength={20} value={datos.phone} onChange={cambiar('phone')} className={campo} /></label>
          </div>
          <label className={etiqueta}><span>Correo</span><input type="email" maxLength={120} value={datos.email} onChange={cambiar('email')} className={campo} /></label>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-bold uppercase tracking-wider text-gray-400">Rol y laboratorio</legend>
          <div className="grid grid-cols-2 gap-1 rounded border border-gray-800 bg-gray-900/60 p-1 text-xs">
            {([['encargado', 'Encargado de laboratorio'], ['admin', 'Administrador general']] as const).map(([id, texto]) => (
              <button key={id} type="button" onClick={() => setDatos(d => ({ ...d, tipo: id }))}
                className={`rounded px-2 py-1.5 font-semibold ${datos.tipo === id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>{texto}</button>
            ))}
          </div>
          {datos.tipo === 'encargado' ? (
            <label className={etiqueta}>
              <span>Laboratorio asignado *</span>
              <select value={datos.workshop_id ?? ''} onChange={e => setDatos(d => ({ ...d, workshop_id: e.target.value ? Number(e.target.value) : null }))} className={campo}>
                <option value="">Elige un laboratorio</option>
                {grupos.map(([local, labs]) => (
                  <optgroup key={local} label={local}>
                    {labs.map(lab => <option key={lab.id} value={lab.id}>{lab.name} ({AREA[lab.laboratory_type] ?? lab.laboratory_type})</option>)}
                  </optgroup>
                ))}
              </select>
              {laboratorio && (
                <span className="block text-[11px] text-gray-500">
                  Rol: {AREA[laboratorio.laboratory_type] === 'Física' ? 'Encargado de Física' : 'Encargado de Química'} · Local: {laboratorio.campus_name ?? <span className="text-amber-400">el laboratorio aún no tiene local</span>}
                </span>
              )}
            </label>
          ) : (
            <p className="text-[11px] text-gray-500">El administrador general ve todos los locales y laboratorios, y gestiona usuarios y locales.</p>
          )}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-xs font-bold uppercase tracking-wider text-gray-400">Cuenta</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={etiqueta}>
              <span>Usuario *</span>
              <input required={nuevo} disabled={!nuevo} minLength={3} maxLength={40} pattern="[A-Za-z0-9._-]+" title="Letras, números, punto, guion o guion bajo"
                value={datos.username} onChange={cambiar('username')} className={`${campo} disabled:opacity-60`} autoComplete="off" />
            </label>
            <label className={etiqueta}>
              <span>{nuevo ? 'Contraseña * (mín. 8)' : 'Nueva contraseña (opcional)'}</span>
              <input type="password" required={nuevo} minLength={8} maxLength={72} value={datos.password} onChange={cambiar('password')} className={campo} autoComplete="new-password" />
            </label>
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800">Cancelar</button>
          <button type="submit" disabled={guardando} className="rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50">
            {guardando ? 'Guardando...' : nuevo ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

function LocalesYLaboratorios({ locales, laboratorios, onCambio, onError }: {
  locales: Local[];
  laboratorios: Workshop[];
  onCambio: (texto: string) => Promise<void>;
  onError: (texto: string) => void;
}) {
  const [nuevo, setNuevo] = useState({ name: '', city: '', address: '' });
  const [editando, setEditando] = useState<Local | null>(null);
  const activos = locales.filter(local => local.is_active);

  const ejecutar = async (accion: () => Promise<unknown>, texto: string) => {
    try { await accion(); await onCambio(texto); } catch (e) { onError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
  };

  const crear = (e: React.FormEvent) => {
    e.preventDefault();
    const datos = { name: nuevo.name.trim(), city: nuevo.city.trim() || null, address: nuevo.address.trim() || null };
    void ejecutar(() => usuariosService.crearLocal(datos), `Local ${datos.name} registrado.`).then(() => setNuevo({ name: '', city: '', address: '' }));
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="space-y-3 rounded border border-gray-800 bg-[#16181e] p-3">
        <h2 className="flex items-center gap-2 text-sm font-bold"><Building2 className="h-4 w-4 text-emerald-400" /> Locales de la universidad</h2>
        <form onSubmit={crear} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input required minLength={2} maxLength={120} placeholder="Nombre del local (p. ej. Parra)" value={nuevo.name} onChange={e => setNuevo(n => ({ ...n, name: e.target.value }))} className={campo} />
          <input maxLength={80} placeholder="Ciudad" value={nuevo.city} onChange={e => setNuevo(n => ({ ...n, city: e.target.value }))} className={campo} />
          <button type="submit" className="flex items-center justify-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-sm font-semibold hover:bg-emerald-500"><Plus className="h-4 w-4" /> Agregar</button>
          <input maxLength={200} placeholder="Dirección (opcional)" value={nuevo.address} onChange={e => setNuevo(n => ({ ...n, address: e.target.value }))} className={`${campo} sm:col-span-3`} />
        </form>
        <ul className="divide-y divide-gray-800">
          {locales.map(local => (
            <li key={local.id} className={`flex items-center justify-between gap-2 py-2 ${local.is_active ? '' : 'opacity-50'}`}>
              {editando?.id === local.id ? (
                <EdicionLocal local={local} onCancelar={() => setEditando(null)}
                  onGuardar={datos => void ejecutar(() => usuariosService.actualizarLocal(local.id, datos), 'Local actualizado.').then(() => setEditando(null))} />
              ) : (
                <>
                  <div className="min-w-0">
                    <p className="font-semibold">{local.name}{!local.is_active && <span className="ml-2 text-xs text-gray-400">(desactivado)</span>}</p>
                    <p className="truncate text-xs text-gray-500">{[local.city, local.address].filter(Boolean).join(' · ') || 'Sin dirección'} · {local.workshop_count} laboratorio(s)</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setEditando(local)} title="Editar" aria-label={`Editar ${local.name}`} className="rounded border border-gray-700 p-1.5 hover:bg-gray-800"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => void ejecutar(() => usuariosService.actualizarLocal(local.id, { is_active: !local.is_active }), local.is_active ? 'Local desactivado.' : 'Local activado.')}
                      title={local.is_active ? 'Desactivar' : 'Activar'} aria-label={`${local.is_active ? 'Desactivar' : 'Activar'} ${local.name}`}
                      className="rounded border border-gray-700 p-1.5 hover:bg-gray-800"><Power className="h-3.5 w-3.5" /></button>
                  </div>
                </>
              )}
            </li>
          ))}
          {locales.length === 0 && <li className="py-3 text-sm text-gray-500">Aún no hay locales. Registra el primero arriba.</li>}
        </ul>
      </section>

      <section className="space-y-3 rounded border border-gray-800 bg-[#16181e] p-3">
        <h2 className="text-sm font-bold">Local de cada laboratorio</h2>
        <p className="text-xs text-gray-500">Los encargados heredan el local de su laboratorio. Los laboratorios se crean en Configurar Reglas.</p>
        <ul className="divide-y divide-gray-800">
          {laboratorios.map(lab => (
            <li key={lab.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <p className="font-semibold">{lab.name}</p>
                <p className="text-xs text-gray-500">{AREA[lab.laboratory_type] ?? lab.laboratory_type}</p>
              </div>
              <select value={lab.campus_id ?? ''} aria-label={`Local de ${lab.name}`}
                onChange={e => void ejecutar(() => usuariosService.asignarLocal(lab.id, e.target.value ? Number(e.target.value) : null), `${lab.name}: local actualizado.`)}
                className={`${campo} w-auto min-w-[12rem] ${lab.campus_id ? '' : 'border-amber-700 text-amber-300'}`}>
                <option value="">Sin local</option>
                {activos.map(local => <option key={local.id} value={local.id}>{local.name}</option>)}
              </select>
            </li>
          ))}
          {laboratorios.length === 0 && <li className="py-3 text-sm text-gray-500">No hay laboratorios. Créalos en Configurar Reglas.</li>}
        </ul>
      </section>
    </div>
  );
}

function EdicionLocal({ local, onGuardar, onCancelar }: { local: Local; onGuardar: (datos: { name: string; city: string | null; address: string | null }) => void; onCancelar: () => void }) {
  const [datos, setDatos] = useState({ name: local.name, city: local.city ?? '', address: local.address ?? '' });
  return (
    <form className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2"
      onSubmit={e => { e.preventDefault(); onGuardar({ name: datos.name.trim(), city: datos.city.trim() || null, address: datos.address.trim() || null }); }}>
      <input required minLength={2} maxLength={120} aria-label="Nombre del local" value={datos.name} onChange={e => setDatos(d => ({ ...d, name: e.target.value }))} className={campo} />
      <input maxLength={80} aria-label="Ciudad" placeholder="Ciudad" value={datos.city} onChange={e => setDatos(d => ({ ...d, city: e.target.value }))} className={campo} />
      <input maxLength={200} aria-label="Dirección" placeholder="Dirección" value={datos.address} onChange={e => setDatos(d => ({ ...d, address: e.target.value }))} className={`${campo} sm:col-span-2`} />
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" onClick={onCancelar} className="rounded border border-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-800">Cancelar</button>
        <button type="submit" className="rounded bg-emerald-600 px-3 py-1 text-xs font-semibold hover:bg-emerald-500">Guardar</button>
      </div>
    </form>
  );
}
