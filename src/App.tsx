import { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import AdminPanel from './pages/AdminPanel';
import ClienteDashboard from './pages/ClienteDashboard';
const ALLOWED_DOMAINS = ['@laprensagrafica.com', '@elgrafico.com'];
const isAllowedEmail = (email: string) => ALLOWED_DOMAINS.some(d => email.endsWith(d));
const getClienteId = () => { const m = window.location.pathname.match(/^\/cliente\/([a-z0-9_-]+)/i); return m ? m[1] : null; };
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const clienteId = getClienteId();
  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      if (u && !isAllowedEmail(u.email ?? '')) { signOut(auth); setAuthError('Correo no autorizado.'); setUser(null); }
      else { setUser(u); setAuthError(''); }
      setAuthLoading(false);
    });
  }, []);
  if (clienteId) return <ClienteDashboard clienteId={clienteId} />;
  if (authLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Login error={authError} onLogin={async () => { setAuthError(''); try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch { setAuthError('Error al iniciar sesión.'); } }} />;
  return <AdminPanel user={user} onLogout={() => signOut(auth)} />;
}
function Login({ onLogin, error }: { onLogin: () => void; error: string }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">LPG</p>
          <h1 className="text-2xl font-bold text-white">Control de Registros</h1>
          <p className="text-sm text-gray-500">Sistema de gestión editorial</p>
        </div>
        {error && <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-300">{error}</div>}
        <button onClick={onLogin} className="w-full flex items-center justify-center gap-3 rounded-xl bg-white text-gray-900 font-semibold py-3 px-4 hover:bg-gray-100 transition-colors">
          <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/><path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/><path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/><path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/></svg>
          Ingresar con Google
        </button>
        <p className="text-center text-xs text-gray-600">Solo cuentas @laprensagrafica.com / @elgrafico.com</p>
      </div>
    </div>
  );
}
