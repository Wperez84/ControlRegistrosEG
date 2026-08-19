import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import type { User } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { Producto, Cliente, Registro, Metrica, RegistroCompleto } from '../types';
import { normLink } from '../lib/normLink';

const SUPER_ADMINS = ['wperez@laprensagrafica.com', 'chuete@laprensagrafica.com'];
const REDES = ['INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'X', 'TIKTOK', 'SITIO WEB', 'OTRO'] as const;
const MARCAS = ['El Gráfico', 'La Prensa Gráfica', 'Mi Chero', 'Guriguiri', 'El Economista', 'Campus', 'EllaSv'];

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

const TIPO_LABEL: Record<string, string> = { evento: 'Evento', campana: 'Campaña', serie: 'Serie', torneo: 'Torneo', otro: 'Otro' };
const TIPO_OPTS = [['evento','Evento'],['campana','Campaña'],['serie','Serie'],['torneo','Torneo'],['otro','Otro']];

const css = `
  :root {
    --bg: #ffffff;
    --bg-alt: #f8f9fa;
    --surface: #ffffff;
    --hover: #f1f3f4;
    --ink: #202124;
    --ink-soft: #3c4043;
    --muted: #5f6368;
    --line: #dadce0;
    --line-soft: #e8eaed;
    --accent: #1a73e8;
    --accent-soft: #e8f0fe;
    --danger: #d93025;
    --success: #188038;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #202124; --bg-alt: #292a2d; --surface: #292a2d;
      --hover: #35363a; --ink: #e8eaed; --ink-soft: #bdc1c6;
      --muted: #9aa0a6; --line: #3c4043; --line-soft: #35363a;
      --accent: #8ab4f8; --accent-soft: #1e2a3e;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: var(--bg); color: var(--ink);
    font-size: 14px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .app { display: grid; grid-template-columns: 256px 1fr; grid-template-rows: 64px 1fr; height: 100vh; }

  /* Header */
  .top-bar {
    grid-column: 1 / -1;
    display: flex; align-items: center; gap: 16px;
    padding: 0 24px;
    border-bottom: 1px solid var(--line-soft);
    background: var(--bg);
  }
  .app-name { display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 18px; letter-spacing: -0.01em; white-space: nowrap; }
  .app-logo {
    width: 32px; height: 32px; border-radius: 8px;
    background: var(--accent); color: white;
    display: grid; place-items: center;
    font-weight: 700; font-size: 15px; flex-shrink: 0;
  }
  .top-search {
    flex: 1; max-width: 600px; margin-left: 24px;
    display: flex; align-items: center; gap: 8px;
    background: var(--bg-alt); border-radius: 24px;
    padding: 0 16px; height: 40px; color: var(--muted);
  }
  .top-search input {
    flex: 1; background: transparent; border: none; outline: none;
    color: var(--ink); font-family: inherit; font-size: 14px;
  }
  .top-right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
  .top-email { font-size: 12px; color: var(--muted); }
  .avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: linear-gradient(135deg, #1a73e8, #a855f7);
    color: white; font-weight: 600; font-size: 13px;
    display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
  }
  .logout-btn {
    font-size: 12px; color: var(--muted); background: none; border: none;
    cursor: pointer; padding: 4px 8px; border-radius: 4px;
    font-family: inherit;
  }
  .logout-btn:hover { background: var(--hover); color: var(--ink); }

  /* Sidebar */
  .side-nav {
    border-right: 1px solid var(--line-soft);
    padding: 12px 0; overflow-y: auto;
    display: flex; flex-direction: column;
  }
  .nav-section { font-size: 11px; letter-spacing: .8px; text-transform: uppercase; color: var(--muted); font-weight: 600; padding: 16px 24px 6px; }
  .nav-btn {
    display: flex; align-items: center; gap: 14px;
    margin: 1px 8px; padding: 10px 16px;
    border-radius: 0 24px 24px 0;
    cursor: pointer; font-size: 14px; font-weight: 500;
    color: var(--ink-soft); transition: background .15s;
    border: none; background: none; font-family: inherit; text-align: left; width: calc(100% - 16px);
  }
  .nav-btn:hover { background: var(--hover); }
  .nav-btn.active { background: var(--accent-soft); color: var(--accent); }
  .nav-icon { font-size: 18px; width: 20px; text-align: center; flex-shrink: 0; }

  .stats-area { margin-top: auto; padding: 16px 12px; display: flex; flex-direction: column; gap: 8px; }
  .stat-card {
    background: var(--bg-alt); border-radius: 12px;
    padding: 12px 14px;
  }
  .stat-label { font-size: 11px; letter-spacing: .6px; text-transform: uppercase; color: var(--muted); font-weight: 600; margin-bottom: 4px; }
  .stat-value { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; }
  .stat-value.blue { color: var(--accent); }
  .stat-value.green { color: #188038; }

  /* Main */
  .main-area { overflow: auto; padding: 28px 32px 40px; }
  .page-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .page-title { font-size: 22px; font-weight: 500; letter-spacing: -0.01em; }
  .page-hint { font-size: 13px; color: var(--muted); margin-top: 2px; }

  /* Filters */
  .filter-row { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .filter-chip {
    padding: 6px 14px; background: var(--bg-alt); border-radius: 20px;
    font-size: 12px; color: var(--ink-soft); cursor: pointer; font-weight: 500;
    border: 1px solid var(--line-soft); font-family: inherit;
    transition: background .15s;
  }
  .filter-chip:hover { background: var(--hover); }
  .filter-chip select {
    background: transparent; border: none; outline: none;
    font-family: inherit; font-size: 12px; color: var(--ink-soft); cursor: pointer;
  }

  /* Buttons */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 20px; height: 36px; border-radius: 18px;
    background: var(--accent); color: white;
    border: none; font-family: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: background .15s; white-space: nowrap;
  }
  .btn-primary:hover { background: #185abc; }
  .btn-outlined {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 16px; height: 34px; border-radius: 18px;
    background: transparent; color: var(--accent);
    border: 1px solid var(--line); font-family: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: background .15s;
  }
  .btn-outlined:hover { background: var(--accent-soft); }
  .btn-tonal {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 16px; height: 34px; border-radius: 18px;
    background: var(--accent-soft); color: var(--accent);
    border: none; font-family: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: background .15s;
  }
  .btn-tonal:hover { background: #d2e3fc; }
  .btn-danger {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 0 16px; height: 34px; border-radius: 18px;
    background: #fce8e6; color: var(--danger);
    border: none; font-family: inherit; font-size: 13px; font-weight: 500;
    cursor: pointer; transition: background .15s;
  }
  .btn-danger:hover { background: #f5c6c3; }

  /* Table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  thead th {
    padding: 8px 16px 8px 0;
    text-align: left; font-size: 11px; font-weight: 600;
    letter-spacing: .6px; text-transform: uppercase; color: var(--muted);
    border-bottom: 1px solid var(--line-soft);
    white-space: nowrap;
  }
  thead th button {
    background: none; border: none; cursor: pointer; font-family: inherit;
    font-size: 11px; font-weight: 600; letter-spacing: .6px; text-transform: uppercase;
    color: var(--muted); display: flex; align-items: center; gap: 3px; padding: 0;
  }
  thead th button:hover { color: var(--ink); }
  thead th button.sorted { color: var(--accent); }
  tbody tr { border-bottom: 1px solid var(--line-soft); transition: background .1s; }
  tbody tr:hover { background: var(--hover); }
  tbody td { padding: 10px 16px 10px 0; font-size: 13px; vertical-align: middle; }
  .td-date { color: var(--muted); font-family: 'Roboto Mono', ui-monospace, monospace; font-size: 12px; white-space: nowrap; }
  .td-link a { color: var(--accent); font-size: 12px; text-decoration: none; max-width: 180px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .td-link a:hover { text-decoration: underline; }
  .td-num { font-weight: 600; tabular-nums: normal; }
  .td-actions { opacity: 0; transition: opacity .15s; }
  tbody tr:hover .td-actions { opacity: 1; }

  /* Pills / badges */
  .project-pill {
    display: inline-block; padding: 2px 10px; border-radius: 12px;
    font-size: 12px; font-weight: 500; white-space: nowrap;
  }
  .red-badge {
    display: inline-block; padding: 2px 8px; border-radius: 10px;
    font-size: 11px; font-weight: 600; letter-spacing: .3px;
    background: var(--bg-alt); color: var(--muted);
  }
  .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; }
  .active-badge { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
  .active-badge.on { color: #188038; }
  .active-badge.off { color: var(--muted); }

  /* Forms */
  .form-card {
    background: var(--bg-alt); border: 1px solid var(--line-soft);
    border-radius: 16px; padding: 24px; margin-bottom: 20px;
  }
  .form-title { font-size: 15px; font-weight: 500; margin-bottom: 20px; }
  .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px 24px; }
  .form-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
  .col-span-2 { grid-column: span 2; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field label { font-size: 11px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: var(--muted); }
  .field input, .field select, .field textarea {
    padding: 8px 12px; border-radius: 8px;
    border: 1px solid var(--line); background: var(--surface);
    font-family: inherit; font-size: 13px; color: var(--ink);
    outline: none; transition: border-color .15s;
  }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: var(--accent); }
  .field input.error { border-color: var(--danger); }
  .field .err-msg { font-size: 11px; color: var(--danger); }
  .color-row { display: flex; align-items: center; gap: 10px; }
  .color-row input[type=color] { width: 36px; height: 36px; border: 1px solid var(--line); border-radius: 8px; padding: 2px; cursor: pointer; background: var(--surface); }
  .color-hex { font-size: 12px; color: var(--muted); font-family: 'Roboto Mono', ui-monospace, monospace; }
  .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }

  /* Project list */
  .item-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 0; border-bottom: 1px solid var(--line-soft);
  }
  .item-row:last-child { border-bottom: none; }
  .item-left { display: flex; align-items: center; gap: 12px; }
  .item-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .item-name { font-size: 14px; font-weight: 500; }
  .item-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .item-right { display: flex; align-items: center; gap: 12px; }
  .item-actions { display: flex; gap: 6px; }

  /* Modal overlay */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(32,33,36,.4);
    z-index: 100; display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .modal {
    background: var(--bg); border-radius: 20px;
    box-shadow: 0 8px 32px rgba(60,64,67,.2);
    width: 100%; max-width: 860px; overflow: hidden;
  }
  .modal-body { padding: 28px; }

  /* Empty states */
  .empty { padding: 64px 0; text-align: center; color: var(--muted); font-size: 14px; }
`;

export default function AdminPanel({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes,  setClientes]  = useState<Cliente[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [metricas,  setMetricas]  = useState<Metrica[]>([]);
  const [view, setView] = useState<'registros' | 'productos' | 'clientes'>('registros');
  const [filtroCliente,  setFiltroCliente]  = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');
  const [filtroRed,      setFiltroRed]      = useState('');
  const [search, setSearch] = useState('');

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

  const initials = (email: string) => email.slice(0, 2).toUpperCase();

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* Header */}
        <header className="top-bar">
          <div className="app-name">
            <div className="app-logo">CR</div>
            Control de Registros
          </div>
          <div className="top-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Buscar registros, proyectos, clientes…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="top-right">
            <span className="top-email">{user.email}</span>
            <button className="logout-btn" onClick={onLogout}>Salir</button>
            <div className="avatar" title={user.email ?? ''}>{initials(user.email ?? 'U')}</div>
          </div>
        </header>

        {/* Sidebar */}
        <nav className="side-nav">
          <div className="nav-section">Vistas</div>
          {([['registros','📋','Registros'],['productos','📁','Proyectos'],['clientes','👥','Clientes']] as const).map(([v, ic, label]) => (
            <button key={v} className={`nav-btn${view === v ? ' active' : ''}`} onClick={() => setView(v)}>
              <span className="nav-icon">{ic}</span>{label}
            </button>
          ))}

          <div className="nav-section">Filtros</div>
          <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Proyecto', value: filtroProducto, onChange: setFiltroProducto, opts: productos.map(p => ({ v: p.id, l: p.nombre })) },
              { label: 'Cliente',  value: filtroCliente,  onChange: setFiltroCliente,  opts: clientes.map(c => ({ v: c.id, l: c.nombre })) },
              { label: 'Red',      value: filtroRed,      onChange: setFiltroRed,      opts: REDES.map(r => ({ v: r, l: r })) },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 4 }}>{f.label}</div>
                <select value={f.value} onChange={e => f.onChange(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', fontFamily: 'inherit', fontSize: 12, color: 'var(--ink)', outline: 'none' }}>
                  <option value="">Todos</option>
                  {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="stats-area">
            <div className="stat-card">
              <div className="stat-label">Alcance total</div>
              <div className="stat-value blue">{totalAlc.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Interacciones</div>
              <div className="stat-value green">{totalInter.toLocaleString()}</div>
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="main-area">
          {view === 'registros' && (
            <VistaRegistros
              registros={registrosCompletos} productos={productos} clientes={clientes}
              user={user} filtroCliente={filtroCliente} filtroProducto={filtroProducto}
              filtroRed={filtroRed} search={search}
            />
          )}
          {view === 'productos' && <VistaProductos productos={productos} isAdmin={isAdmin} />}
          {view === 'clientes'  && <VistaClientes  clientes={clientes}   isAdmin={isAdmin} />}
        </main>
      </div>
    </>
  );
}

// ── Vista Registros ───────────────────────────────────────────────────────────
function VistaRegistros({ registros, productos, clientes, user, filtroCliente, filtroProducto, filtroRed, search }: {
  registros: RegistroCompleto[]; productos: Producto[]; clientes: Cliente[];
  user: User; filtroCliente: string; filtroProducto: string; filtroRed: string; search: string;
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
    const q = search.toLowerCase();
    let rs = registros.filter(r =>
      (!filtroCliente  || r.clienteId  === filtroCliente) &&
      (!filtroProducto || r.productoId === filtroProducto) &&
      (!filtroRed      || r.red        === filtroRed) &&
      (!q || r.link.toLowerCase().includes(q) || (r.productoNombre ?? '').toLowerCase().includes(q) || (r.clienteNombre ?? '').toLowerCase().includes(q) || r.marca.toLowerCase().includes(q))
    );
    if (sortCol) rs = [...rs].sort((a, b) => {
      const av = sortCol === 'fecha' ? a.fecha : Number(a[sortCol] || 0);
      const bv = sortCol === 'fecha' ? b.fecha : Number(b[sortCol] || 0);
      return sortDir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1);
    });
    return rs;
  }, [registros, filtroCliente, filtroProducto, filtroRed, sortCol, sortDir, search]);

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
    <button className={sortCol === col ? 'sorted' : ''} onClick={() => toggleSort(col)}>
      {label} {sortCol === col ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
    </button>
  );

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Registros</div>
          <div className="page-hint">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>＋ Nuevo registro</button>
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-body">
              <FormRegistro productos={productos.filter(p => p.activo)} clientes={clientes}
                onSubmit={handleNuevoRegistro} onCancel={() => setShowForm(false)} />
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th><SortBtn col="fecha" label="Fecha" /></th>
              <th>Proyecto</th>
              <th>Cliente</th>
              <th>Red</th>
              <th>Marca</th>
              <th>Sección</th>
              <th><SortBtn col="alcances" label="Alcance" /></th>
              <th><SortBtn col="interacciones" label="Int." /></th>
              <th>Link</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="td-date">{r.fecha}</td>
                <td>
                  <span className="project-pill"
                    style={r.productoColor ? { backgroundColor: r.productoColor + '20', color: r.productoColor } : { color: 'var(--muted)' }}>
                    {r.productoNombre || '—'}
                  </span>
                </td>
                <td>
                  <span className="project-pill"
                    style={{ backgroundColor: (r.clienteColor || '#6b7280') + '20', color: r.clienteColor || 'var(--muted)' }}>
                    {r.clienteNombre || r.clienteId}
                  </span>
                </td>
                <td><span className="red-badge">{r.red}</span></td>
                <td style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{r.marca}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{r.seccion || '—'}</td>
                <td className="td-num" style={{ color: 'var(--accent)' }}>{r.alcances ? Number(r.alcances).toLocaleString() : '—'}</td>
                <td className="td-num" style={{ color: '#188038' }}>{r.interacciones ? Number(r.interacciones).toLocaleString() : '—'}</td>
                <td className="td-link"><a href={r.link} target="_blank" rel="noreferrer">{r.link}</a></td>
                <td className="td-actions">
                  {(isAdmin || r.creadoPor === user.uid) && (
                    <button className="btn-danger" style={{ height: 28, padding: '0 10px', fontSize: 12 }} onClick={() => handleEliminar(r)}>Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={10}><div className="empty">Sin registros</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Formulario nuevo registro ─────────────────────────────────────────────────
function FormRegistro({ productos, clientes, onSubmit, onCancel }: {
  productos: Producto[]; clientes: Cliente[];
  onSubmit: (data: Omit<Registro, 'id' | 'creadoEn' | 'creadoPor'>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    productoId: '', clienteId: '', red: 'INSTAGRAM' as Registro['red'],
    marca: MARCAS[0], link: '', seccion: '', categoria: '',
    fecha: new Date().toISOString().slice(0, 10), notas: '',
  });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const linkError = form.link ? validarLink(form.link, form.red) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.productoId || !form.clienteId || !form.link || linkError) return;
    onSubmit({ ...form, guardado: false });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-title">Nuevo registro</div>
      <div className="form-grid cols-4">
        <div className="field">
          <label>Proyecto *</label>
          <select required value={form.productoId} onChange={e => set('productoId', e.target.value)}>
            <option value="">—</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Cliente *</label>
          <select required value={form.clienteId} onChange={e => set('clienteId', e.target.value)}>
            <option value="">—</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Red</label>
          <select value={form.red} onChange={e => set('red', e.target.value)}>
            {REDES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Marca</label>
          <select value={form.marca} onChange={e => set('marca', e.target.value)}>
            {MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="field col-span-2">
          <label>Link *</label>
          <input required value={form.link} onChange={e => set('link', e.target.value)}
            placeholder="https://…" className={linkError ? 'error' : ''} />
          {linkError && <span className="err-msg">{linkError}</span>}
        </div>
        <div className="field">
          <label>Sección</label>
          <input value={form.seccion} onChange={e => set('seccion', e.target.value)} placeholder="Previa…" />
        </div>
        <div className="field">
          <label>Fecha</label>
          <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </div>
      </div>
      <div className="form-actions">
        <button type="button" className="btn-outlined" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}

// ── Vista Proyectos ───────────────────────────────────────────────────────────
function VistaProductos({ productos, isAdmin }: { productos: Producto[]; isAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm]         = useState({ nombre: '', tipo: 'evento' as Producto['tipo'], color: '#1a73e8', descripcion: '', fechaInicio: '', fechaFin: '' });
  const [editForm, setEditForm] = useState({ nombre: '', tipo: 'evento' as Producto['tipo'], color: '#1a73e8', descripcion: '', fechaInicio: '', fechaFin: '' });
  const set  = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const setE = (k: string, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  function startEdit(p: Producto) {
    setEditId(p.id);
    setEditForm({ nombre: p.nombre, tipo: p.tipo, color: p.color || '#1a73e8', descripcion: p.descripcion || '', fechaInicio: p.fechaInicio || '', fechaFin: p.fechaFin || '' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addDoc(collection(db, 'productos'), { ...form, activo: true, creadoEn: Date.now(), creadoPor: '' });
    setForm({ nombre: '', tipo: 'evento', color: '#1a73e8', descripcion: '', fechaInicio: '', fechaFin: '' });
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

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Proyectos</div>
          <div className="page-hint">{productos.length} proyecto{productos.length !== 1 ? 's' : ''}</div>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => { setShowForm(s => !s); setEditId(null); }}>＋ Nuevo</button>}
      </div>

      {showForm && (
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-title">Nuevo proyecto</div>
            <div className="form-grid">
              <div className="field col-span-2">
                <label>Nombre *</label>
                <input required value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div className="field">
                <label>Tipo</label>
                <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                  {TIPO_OPTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Color</label>
                <div className="color-row">
                  <input type="color" value={form.color} onChange={e => set('color', e.target.value)} />
                  <span className="color-hex">{form.color}</span>
                </div>
              </div>
              <div className="field">
                <label>Descripción</label>
                <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
              </div>
              <div className="field">
                <label>Fecha inicio</label>
                <input type="date" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} />
              </div>
              <div className="field col-span-2">
                <label>Fecha fin</label>
                <input type="date" value={form.fechaFin} onChange={e => set('fechaFin', e.target.value)} />
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-outlined" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      )}

      <div>
        {productos.map(p => (
          <div key={p.id}>
            {editId === p.id ? (
              <div className="form-card" style={{ marginTop: 8 }}>
                <form onSubmit={handleEdit}>
                  <div className="form-title">Editar proyecto</div>
                  <div className="form-grid">
                    <div className="field col-span-2">
                      <label>Nombre *</label>
                      <input required value={editForm.nombre} onChange={e => setE('nombre', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Tipo</label>
                      <select value={editForm.tipo} onChange={e => setE('tipo', e.target.value)}>
                        {TIPO_OPTS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Color</label>
                      <div className="color-row">
                        <input type="color" value={editForm.color} onChange={e => setE('color', e.target.value)} />
                        <span className="color-hex">{editForm.color}</span>
                      </div>
                    </div>
                    <div className="field">
                      <label>Descripción</label>
                      <input value={editForm.descripcion} onChange={e => setE('descripcion', e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Fecha inicio</label>
                      <input type="date" value={editForm.fechaInicio} onChange={e => setE('fechaInicio', e.target.value)} />
                    </div>
                    <div className="field col-span-2">
                      <label>Fecha fin</label>
                      <input type="date" value={editForm.fechaFin} onChange={e => setE('fechaFin', e.target.value)} />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn-outlined" onClick={() => setEditId(null)}>Cancelar</button>
                    <button type="submit" className="btn-primary">Guardar cambios</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="item-row">
                <div className="item-left">
                  <div className="item-dot" style={{ backgroundColor: p.color || '#6b7280' }} />
                  <div>
                    <div className="item-name">{p.nombre}</div>
                    <div className="item-sub">
                      {TIPO_LABEL[p.tipo] ?? p.tipo}
                      {p.fechaInicio ? ` · ${p.fechaInicio}` : ''}
                      {p.fechaFin ? ` → ${p.fechaFin}` : ''}
                    </div>
                  </div>
                </div>
                <div className="item-right">
                  <span className={`active-badge ${p.activo ? 'on' : 'off'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                  {isAdmin && (
                    <div className="item-actions">
                      <button className="btn-tonal" style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => startEdit(p)}>Editar</button>
                      <button className="btn-outlined" style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => toggleActivo(p)}>
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {productos.length === 0 && <div className="empty">Sin proyectos</div>}
      </div>
    </div>
  );
}

// ── Vista Clientes ────────────────────────────────────────────────────────────
function VistaClientes({ clientes, isAdmin }: { clientes: Cliente[]; isAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', color: '#1a73e8' });
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addDoc(collection(db, 'clientes'), { ...form, activo: true, creadoEn: Date.now() });
    setForm({ nombre: '', color: '#1a73e8' });
    setShowForm(false);
  }

  async function toggleActivo(c: Cliente) {
    await updateDoc(doc(db, 'clientes', c.id), { activo: !c.activo });
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="page-title">Clientes</div>
          <div className="page-hint">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''}</div>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => setShowForm(s => !s)}>＋ Nuevo</button>}
      </div>

      {showForm && (
        <div className="form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-title">Nuevo cliente</div>
            <div className="form-grid">
              <div className="field col-span-2">
                <label>Nombre *</label>
                <input required value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>
              <div className="field">
                <label>Color</label>
                <div className="color-row">
                  <input type="color" value={form.color} onChange={e => set('color', e.target.value)} />
                  <span className="color-hex">{form.color}</span>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn-outlined" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      )}

      <div>
        {clientes.map(c => (
          <div key={c.id} className="item-row">
            <div className="item-left">
              <div className="item-dot" style={{ backgroundColor: c.color }} />
              <div className="item-name">{c.nombre}</div>
            </div>
            <div className="item-right">
              <span className={`active-badge ${c.activo ? 'on' : 'off'}`}>{c.activo ? 'Activo' : 'Inactivo'}</span>
              {isAdmin && (
                <button className="btn-outlined" style={{ height: 30, padding: '0 12px', fontSize: 12 }} onClick={() => toggleActivo(c)}>
                  {c.activo ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </div>
          </div>
        ))}
        {clientes.length === 0 && <div className="empty">Sin clientes</div>}
      </div>
    </div>
  );
}
