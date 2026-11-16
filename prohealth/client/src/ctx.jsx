import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, resetToken } from './api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const [me, setMe] = useState(null);          // {user, cartCount, pharmacy, deliveryFee}
  const [loading, setLoading] = useState(true);
  const [flashes, setFlashes] = useState([]);
  const loc = useLocation();

  const refresh = useCallback(async () => { try { setMe(await api.get('/api/me')); } finally { setLoading(false); } }, []);
  useEffect(() => { refresh(); }, [refresh]);

  // A flash survives the next page change, then disappears.
  const flash = useCallback((type, message) => setFlashes((f) => [...f, { id: Math.random(), type, message, keep: 1 }]), []);
  const dismiss = (id) => setFlashes((f) => f.filter((x) => x.id !== id));
  useEffect(() => { setFlashes((f) => f.filter((x) => x.keep > 0).map((x) => ({ ...x, keep: x.keep - 1 }))); }, [loc.pathname]);

  const logout = useCallback(async () => { await api.post('/api/auth/logout'); resetToken(); await refresh(); }, [refresh]);
  const value = { me, user: me?.user ?? null, loading, refresh, flashes, flash, dismiss, logout, isStaff: ['admin', 'pharmacist'].includes(me?.user?.role), isAdmin: me?.user?.role === 'admin' };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
