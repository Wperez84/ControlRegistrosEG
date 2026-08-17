import React from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { Producto, Cliente, Registro, Metrica, RegistroCompleto } from '../types';
import { normLink } from '../lib/normLink';

const SUPER_ADMINS = ['wperez@laprensagrafica.com', 'chuete@laprensagrafica.com'];
const REDES = ['INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'TIKTOK', 'SITIO WEB', 'OTRO'] as const;
const MARCAS = ['LPG', 'EG', 'EGTV', 'GuiriGuiri', 'Mi Chero', 'Ellasv', 'El Economista', 'Departamento15', 'Campus'];
const TIPOS_PAUTA = [
  'Enlace', 'Logo Rotativo en Pantalla', 'Pleca Horizontal/Pleca L', 'Product Placement',
  'Reels Varios', 'Menciones', 'Entrevista', 'Spot', 'Cuñas', 'Cortina',
  'Post en Redes Sociales', 'Spot/Mención/Pleca',
] as const;

const LINK_DOMINIOS: Partial<Record<string, string[]>> = {
  INSTAGRAM: ['instagram.com'],
  FACEBOOK:  ['facebook.com', 'fb.com', 'fb.watch'],
  YOUTUBE:   ['youtube.com', 'youtu.be'],
  X:         ['x.com', 'twitter.com'],
  TIKTOK:    ['tiktok.com'],
};

function validarLink(link: string, red: string): string | null {
  const dominios = LINK_DOMINIOS[red];
  if (!dominios) return null;
  try {
    const host = new URL(link).hostname.replace(/^www\./, '');
    if (!dominios.some(d => host === d || host.endsWith('.' + d)))
      return `El link no parece ser de ${red}. Se esperan: ${dominios.join(', ')}`;
  } catch { return 'URL inválida'; }
  return null;
}

const inp = "w-full bg-transparent border-b border-gray-200 px-0 py-2 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-black/30 transition-colors";
const sel = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-black focus:outline-none focus:border-black/20 transition-colors";

export default function AdminPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [productos, setProductos]   = useState<Producto[]>([]);
  const [clientes,  setClientes]    = useState<Cliente[]>([]);
  const [registros, setRegistros]   = useState<Registro[]>([]);
  const [metricas,  setMetricas]    = useState<Metrica[]>([]);
  const [view,      setView]        = useState<'registros' | 'productos' | 'clientes'>('registros');
  const [filtroCliente,  setFiltroCliente]  = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroRed,      setFiltroRed]      = useState('');

  const isAdmin = SUPER_ADMINS.includes(user.email ?? '');

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'productos'), orderBy('creadoEn', 'desc')), s => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() } as Producto)))),
      onSnapshot(query(collection(db, 'clientes'),  orderBy('creadoEn', 'desc')), s => setClientes(s.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)))),
      onSnapshot(query(collection(db, 'registros'), orderBy('creadoEn', 'desc')), s => setRegistros(s.docs.map(d => ({ id: d.id, ...d.data() } as Registro)))),
      onSnapshot(collection(db, 'metricas'), s => setMetricas(s.docs.map(d => ({ registroId: d.id, ...d.data() } as Metrica)))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const pMap = useMemo(() => Object.fromEntries(productos.map(p => [p.id, p])), [productos]);
  const cMap = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c])),  [clientes]);
  const mMap = useMemo(() => Object.fromEntries(metricas.map(m => [m.registroId, m])), [metricas]);

  const registrosCompletos = useMemo<RegistroCompleto[]>(() => {
    const byNorm: Record<string, { alc: number | undefined; inter: number | undefined }> = {};
    registros.forEach(r => {
      const nk = normLink(r.link);
      if (!nk) return;
      const m = mMap[r.id];
      const prev = byNorm[nk];
      byNorm[nk] = {
        alc:   Math.max(prev?.alc ?? 0, m?.alcances ?? 0) || undefined,
        inter: Math.max(prev?.inter ?? 0, m?.interacciones ?? 0) || undefined,
      };
    });
    return registros.map(r => {
      const nk = normLink(r.link);
      const totals = byNorm[nk] ?? {};
      return {
        ...r,
        alcances:       totals.alc,
        interacciones:  totals.inter,
        productoNombre: pMap[r.productoId]?.nombre,
        productoColor:  pMap[r.productoId]?.color,
        clienteNombre:  cMap[r.clienteId]?.nombre,
        clienteColor:   cMap[r.clienteId]?.color,
      };
    });
  }, [registros, mMap, pMap, cMap]);

  const totalAlc   = useMemo(() => { const seen = new Set<string>(); let t = 0; registrosCompletos.forEach(r => { const nk = normLink(r.link); if (nk && !seen.has(nk) && r.alcances) { seen.add(nk); t += r.alcances; } }); return t; }, [registrosCompletos]);
  const totalInter = useMemo(() => { const seen = new Set<string>(); let t = 0; registrosCompletos.forEach(r => { const nk = normLink(r.link); if (nk && !seen.has(nk) && r.interacciones) { seen.add(nk); t += r.interacciones; } }); return t; }, [registrosCompletos]);

  const navItem = (v: typeof view, label: string) => (
    <button onClick={() => setView(v)}
      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${view === v ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-800'}`}>
      {label}
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        <span className="text-xs font-bold text-blue-600 tracking-widest uppercase">Grupo LPG</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{user.email}</span>
          <button onClick={onLogout} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Salir</button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-44 bg-gray-100 border-r border-gray-200 flex flex-col p-3 gap-1">
          <p className="text-[9px] text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">Vistas</p>
          {navItem('registros', 'Registros')}
          {navItem('productos', 'Proyectos')}
          {navItem('clientes',  'Clientes')}

          <div className="mt-4 space-y-3 px-1">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest">Filtros</p>
            <div>
              <p className="text-[9px] text-gray-500 mb-1">Proyecto</p>
              <select value={filtroProducto} onChange={e => setFiltroProducto(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 focus:outline-none">
                <option value="">Todos</option>
                {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 mb-1">Cliente</p>
              <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 focus:outline-none">
                <option value="">Todos</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[9px] text-gray-500 mb-1">Red</p>
              <select value={filtroRed} onChange={e => setFiltroRed(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-md px-2 py-1 text-[11px] text-gray-700 focus:outline-none">
                <option value="">Todas</option>
                {REDES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-auto pt-4 space-y-2 px-1">
            <div className="bg-white rounded-lg p-3 space-y-1">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">Alcance total</p>
              <p className="text-sm font-semibold text-blue-600">{totalAlc.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-3 space-y-1">
              <p className="text-[9px] text-gray-400 uppercase tracking-widest">Interacciones</p>
              <p className="text-sm font-semibold text-emerald-600">{totalInter.toLocaleString()}</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-auto">
          {view === 'registros' && (
            <VistaRegistros
              registros={registrosCompletos} productos={productos} clientes={clientes}
              user={user} filtroCliente={filtroCliente} filtroProducto={filtroProducto} filtroRed={filtroRed}
            />
          )}
          {view === 'productos' && <VistaProductos productos={productos} isAdmin={isAdmin} />}
          {view === 'clientes'  && <VistaClientes  clientes={clientes}   isAdmin={isAdmin} />}
        </main>
      </div>
    </div>
  );
}

function VistaRegistros({ registros, productos, clientes, user, filtroCliente, filtroProducto, filtroRed }: {
  registros: RegistroCompleto[];
  productos: Producto[];
  clientes: Cliente[];
  user: User;
  filtroCliente: string;
  filtroProducto: string;
  filtroRed: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [sortCol, setSortCol] = useState<'fecha' | 'alcances' | 'interacciones' | null>(null);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const isAdmin = SUPER_ADMINS.includes(user.email ?? '');

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  const filtered = useMemo(() => {
    let rs = registros.filter(r =>
      (!filtroCliente  || r.clienteId  === filtroCliente) &&
      (!filtroProducto || r.productoId === filtroProducto) &&
      (!filtroRed      || r.red        === filtroRed)
    );
    if (sortCol) rs = [...rs].sort((a, b) => {
      const av = sortCol === 'fecha' ? a.fecha : Number(a[sortCol] || 0);
      const bv = sortCol === 'fecha' ? b.fecha : Number(b[sortCol] || 0);
      return sortDir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
    });
    return rs;
  }, [registros, filtroCliente, filtroProducto, filtroRed, sortCol, sortDir]);

  async function handleNuevoRegistro(data: Omit<Registro, 'id' | 'creadoEn' | 'creadoPor'>) {
    await addDoc(collection(db, 'registros'), { ...data, creadoEn: Date.now(), creadoPor: user.uid });
    await addDoc(collection(db, 'actividad'), { email: user.email, link: data.link, red: data.red, clienteId: data.clienteId, productoId: data.productoId, ts: Date.now() });
    setShowForm(false);
  }

  async function handleEliminar(r: RegistroCompleto) {
    if (!confirm(`¿Eliminar este registro?\n\n${r.red} · ${r.marca}\n${r.link}\n\nEsta acción no se puede deshacer.`)) return;
    await deleteDoc(doc(db, 'registros', r.id));
  }

  const SortBtn = ({ col, label }: { col: typeof sortCol; label: string }) => (
    <button onClick={() => toggleSort(col)}
      className={`flex items-center gap-0.5 text-[9px] tracking-widest uppercase font-medium whitespace-nowrap transition-colors ${sortCol === col ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
      {label}
      <span className="text-[8px]">{sortCol === col ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ' ↕'}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(true)}
          className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-black text-white hover:bg-black/80 transition-colors">
          + Nuevo registro
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowForm(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-5xl mx-6 overflow-hidden">
            <FormRegistro productos={productos.filter(p => p.activo)} clientes={clientes}
              onSubmit={handleNuevoRegistro} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 pr-5 text-left"><SortBtn col="fecha" label="Fecha" /></th>
              {['Proyecto', 'Cliente', 'Red', 'Marca', 'Tipo de Pauta'].map(h => (
                <th key={h} className="pb-2 pr-5 text-left text-[9px] tracking-widest uppercase text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
              <th className="pb-2 pr-5 text-left"><SortBtn col="alcances" label="Alcance" /></th>
              <th className="pb-2 pr-5 text-left"><SortBtn col="interacciones" label="Int." /></th>
              <th className="pb-2 pr-5 text-left text-[9px] tracking-widest uppercase text-gray-400 font-medium">Link</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors group">
                <td className="py-2 pr-5 text-gray-500 font-mono text-[10px] whitespace-nowrap">{r.fecha}</td>
                <td className="py-2 pr-5 max-w-[150px] truncate">
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                    style={r.productoColor ? { backgroundColor: r.productoColor + '22', color: r.productoColor } : { color: '#6b7280' }}>
                    {r.productoNombre || '—'}
                  </span>
                </td>
                <td className="py-2 pr-5">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: (r.clienteColor || '#6b7280') + '22', color: r.clienteColor || '#9ca3af' }}>
                    {r.clienteNombre || r.clienteId}
                  </span>
                </td>
                <td className="py-2 pr-5 text-gray-500 text-[10px]">{r.red}</td>
                <td className="py-2 pr-5 text-gray-400 text-[10px]">{r.marca}</td>
                <td className="py-2 pr-5 text-gray-400 text-[10px] max-w-[130px] truncate">{r.tipoPauta}</td>
                <td className="py-2 pr-5 text-blue-500 text-[10px] font-medium tabular-nums">{r.alcances ? Number(r.alcances).toLocaleString() : '—'}</td>
                <td className="py-2 pr-5 text-emerald-500 text-[10px] font-medium tabular-nums">{r.interacciones ? Number(r.interacciones).toLocaleString() : '—'}</td>
                <td className="py-2 pr-5 max-w-[160px] truncate">
                  <a href={r.link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-700 text-[10px] transition-colors">{r.link}</a>
                </td>
                <td className="py-2">
                  {(isAdmin || r.creadoPor === user.uid) && (
                    <button onClick={() => handleEliminar(r)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 text-[10px] px-1">
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="py-16 text-center text-gray-300 text-sm">Sin registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FormRegistro({ productos, clientes, onSubmit, onCancel }: {
  productos: Producto[];
  clientes: Cliente[];
  onSubmit: (data: Omit<Registro, 'id' | 'creadoEn' | 'creadoPor'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    productoId: '', clienteId: '', red: 'INSTAGRAM' as Registro['red'],
    marca: MARCAS[0], tipoPauta: TIPOS_PAUTA[0] as Registro['tipoPauta'],
    link: '', categoria: '',
    fecha: new Date().toISOString().slice(0, 10), notas: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const linkError = form.link ? validarLink(form.link, form.red) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productoId || !form.clienteId || !form.link) return;
    if (linkError) return;
    onSubmit({ ...form, guardado: false });
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <p className="text-xs font-semibold text-gray-700">Nuevo registro</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
        <div>
          <label className="text-[10px] text-gray-800 uppercase tracking-widest">Proyecto *</label>
          <select required value={form.productoId} onChange={e => set('productoId', e.target.value)} className={sel + " mt-1"}>
            <option value="">—</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-800 uppercase tracking-widest">Cliente *</label>
          <select required value={form.clienteId} onChange={e => set('clienteId', e.target.value)} className={sel + " mt-1"}>
            <option value="">—</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-800 uppercase tracking-widest">Red</label>
          <select value={form.red} onChange={e => set('red', e.target.value)} className={sel + " mt-1"}>
            {REDES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-800 uppercase tracking-widest">Marca Editorial</label>
          <select value={form.marca} onChange={e => set('marca', e.target.value)} className={sel + " mt-1"}>
            {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-800 uppercase tracking-widest">Tipo de Pauta</label>
          <select value={form.tipoPauta} onChange={e => set('tipoPauta', e.target.value)} className={sel + " mt-1"}>
            {TIPOS_PAUTA.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-gray-800 uppercase tracking-widest">Link *</label>
          <input required value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://…"
            className={inp + " mt-1 " + (linkError ? 'border-red-400' : '')} />
          {linkError && <p className="text-[10px] text-red-400 mt-1">{linkError}</p>}
        </div>
        <div>
          <label className="text-[10px] text-gray-800 uppercase tracking-widest">Fecha</label>
          <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} className={inp + " mt-1"} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-800 transition-colors px-4 py-2">Cancelar</button>
        <button type="submit" className="text-xs font-medium px-4 py-2 rounded-lg bg-white text-black border border-gray-200 hover:bg-black hover:text-white transition-colors">Guardar</button>
      </div>
    </form>
  );
}

function VistaProductos({ productos, isAdmin }: { productos: Producto[]; isAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', tipo: 'evento' as Producto['tipo'], color: '#3b82f6', descripcion: '', fechaInicio: '', fechaFin: '' });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', tipo: 'evento' as Producto['tipo'], color: '#3b82f6', descripcion: '', fechaInicio: '', fechaFin: '' });
  const set  = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setE = (k: string, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  function startEdit(p: Producto) {
    setEditId(p.id);
    setEditForm({ nombre: p.nombre, tipo: p.tipo, color: p.color || '#3b82f6', descripcion: p.descripcion || '', fechaInicio: p.fechaInicio || '', fechaFin: p.fechaFin || '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addDoc(collection(db, 'productos'), { ...form, activo: true, creadoEn: Date.now(), creadoPor: '' });
    setForm({ nombre: '', tipo: 'evento', color: '#3b82f6', descripcion: '', fechaInicio: '', fechaFin: '' });
    setShowForm(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    await updateDoc(doc(db, 'productos', editId), { ...editForm });
    setEditId(null);
  }

  async function toggleActivo(p: Producto) {
    await updateDoc(doc(db, 'productos', p.id), { activo: !p.activo });
  }

  const TIPO_LABEL: Record<string, string> = { evento: 'Evento', campana: 'Campaña', serie: 'Serie', torneo: 'Torneo', otro: 'Otro' };
  const tipoOpts = [['evento','Evento'],['campana','Campaña'],['serie','Serie'],['torneo','Torneo'],['otro','Otro']];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-800 uppercase tracking-widest">{productos.length} proyecto{productos.length !== 1 ? 's' : ''}</p>
        {isAdmin && (
          <button onClick={() => setShowForm(s => !s)}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-black text-white hover:bg-black/80 transition-colors">
            + Nuevo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-medium text-gray-800 uppercase tracking-widest">Nuevo proyecto</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div className="col-span-2">
              <label className="text-[10px] text-gray-800 uppercase tracking-widest">Nombre *</label>
              <input required value={form.nombre} onChange={e => set('nombre', e.target.value)} className={inp + " mt-1"} />
            </div>
            <div>
              <label className="text-[10px] text-gray-800 uppercase tracking-widest">Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)} className={sel + " mt-1"}>
                {tipoOpts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-800 uppercase tracking-widest">Color</label>
              <div className="flex items-center gap-2 mt-2">
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                <span className="text-xs text-gray-400 font-mono">{form.color}</span>
              </div>
            </div>
            <div>
              <label className="text-[10px] text-gray-800 uppercase tracking-widest">Descripción</label>
              <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} className={inp + " mt-1"} />
            </div>
            <div>
              <label className="text-[10px] text-gray-800 uppercase tracking-widest">Fecha inicio</label>
              <input type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} className={inp + " mt-1"} />
            </div>
            <div>
              <label className="text-[10px] text-gray-800 uppercase tracking-widest">Fecha fin</label>
              <input type="date" value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)} className={inp + " mt-1"} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-500 px-4 py-2">Cancelar</button>
            <button type="submit" className="text-xs font-medium px-4 py-2 rounded-lg bg-black text-white hover:bg-black/80 transition-colors">Guardar</button>
          </div>
        </form>
      )}

      <div className="space-y-1">
        {productos.map(p => (
          <div key={p.id}>
            {editId === p.id ? (
              <form onSubmit={handleEdit} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 my-2 space-y-4">
                <p className="text-xs font-medium text-gray-800 uppercase tracking-widest">Editar proyecto</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2">
                    <label className="text-[10px] text-gray-800 uppercase tracking-widest">Nombre *</label>
                    <input required value={editForm.nombre} onChange={e => setE('nombre', e.target.value)} className={inp + " mt-1"} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-800 uppercase tracking-widest">Tipo</label>
                    <select value={editForm.tipo} onChange={e => setE('tipo', e.target.value)} className={sel + " mt-1"}>
                      {tipoOpts.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-800 uppercase tracking-widest">Color</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="color" value={editForm.color} onChange={e => setE('color', e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                      <span className="text-xs text-gray-400 font-mono">{editForm.color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-800 uppercase tracking-widest">Descripción</label>
                    <input value={editForm.descripcion} onChange={e => setE('descripcion', e.target.value)} className={inp + " mt-1"} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-800 uppercase tracking-widest">Fecha inicio</label>
                    <input type="date" value={editForm.fechaInicio} onChange={e => setE('fechaInicio', e.target.value)} className={inp + " mt-1"} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-800 uppercase tracking-widest">Fecha fin</label>
                    <input type="date" value={editForm.fechaFin} onChange={e => setE('fechaFin', e.target.value)} className={inp + " mt-1"} />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-1">
                  <button type="button" onClick={() => setEditId(null)} className="text-xs text-gray-500 px-4 py-2">Cancelar</button>
                  <button type="submit" className="text-xs font-medium px-4 py-2 rounded-lg bg-black text-white hover:bg-black/80 transition-colors">Guardar</button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between py-4 border-b border-gray-100 group">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || '#6b7280' }} />
                  <div>
                    <p className="text-sm text-gray-800">{p.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {TIPO_LABEL[p.tipo] ?? p.tipo}
                      {p.fechaInicio ? ` · ${p.fechaInicio}` : ''}
                      {p.fechaFin ? ` → ${p.fechaFin}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[9px] font-medium uppercase tracking-widest ${p.activo ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {p.activo ? 'activo' : 'inactivo'}
                  </span>
                  {isAdmin && (
                    <>
                      <button onClick={() => startEdit(p)} className="text-[10px] text-gray-500 hover:text-gray-800 transition-colors opacity-0 group-hover:opacity-100">
                        Editar
                      </button>
                      <button onClick={() => toggleActivo(p)} className="text-[10px] text-gray-500 hover:text-gray-800 transition-colors opacity-0 group-hover:opacity-100">
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {productos.length === 0 && <p className="py-16 text-center text-gray-300 text-sm">Sin proyectos</p>}
      </div>
    </div>
  );
}

function VistaClientes({ clientes, isAdmin }: { clientes: Cliente[]; isAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', color: '#3b82f6' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addDoc(collection(db, 'clientes'), { ...form, activo: true, creadoEn: Date.now() });
    setForm({ nombre: '', color: '#3b82f6' });
    setShowForm(false);
  }

  async function toggleActivo(c: Cliente) {
    await updateDoc(doc(db, 'clientes', c.id), { activo: !c.activo });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-800 uppercase tracking-widest">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</p>
        {isAdmin && (
          <button onClick={() => setShowForm(s => !s)}
            className="text-xs font-medium px-4 py-2 rounded-lg bg-black text-white hover:bg-black/80 transition-colors">
            + Nuevo
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-5">
          <p className="text-xs font-medium text-gray-800 uppercase tracking-widest">Nuevo cliente</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <div className="col-span-2">
              <label className="text-[10px] text-gray-800 uppercase tracking-widest">Nombre *</label>
              <input required value={form.nombre} onChange={e => set('nombre', e.target.value)} className={inp + " mt-1"} />
            </div>
            <div>
              <label className="text-[10px] text-gray-800 uppercase tracking-widest">Color</label>
              <div className="flex items-center gap-2 mt-2">
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent p-0" />
                <span className="text-xs text-gray-400 font-mono">{form.color}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="text-xs text-gray-500 px-4 py-2">Cancelar</button>
            <button type="submit" className="text-xs font-medium px-4 py-2 rounded-lg bg-black text-white hover:bg-black/80 transition-colors">Guardar</button>
          </div>
        </form>
      )}

      <div className="space-y-1">
        {clientes.map(c => (
          <div key={c.id} className="flex items-center justify-between py-4 border-b border-gray-100 group">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <p className="text-sm text-gray-800">{c.nombre}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-[9px] font-medium uppercase tracking-widest ${c.activo ? 'text-emerald-400' : 'text-gray-400'}`}>
                {c.activo ? 'activo' : 'inactivo'}
              </span>
              {isAdmin && (
                <button onClick={() => toggleActivo(c)} className="text-[10px] text-gray-500 hover:text-gray-800 transition-colors opacity-0 group-hover:opacity-100">
                  {c.activo ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </div>
          </div>
        ))}
        {clientes.length === 0 && <p className="py-16 text-center text-gray-300 text-sm">Sin clientes</p>}
      </div>
    </div>
  );
}
