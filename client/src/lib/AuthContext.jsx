import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';
import { getProfile } from './auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(authUser) {
    if (!authUser) { setUser(null); setProfile(null); return; }
    setUser(authUser);
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      );
      const p = await Promise.race([getProfile(authUser.id), timeout]);
      setProfile(p ?? null);
    } catch (e) {
      console.error('[auth] getProfile error:', e.message);
      setProfile(null);
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        // handle initial session without double-loading
        loadProfile(session?.user ?? null).finally(() => setLoading(false));
      } else {
        setLoading(true);
        loadProfile(session?.user ?? null).finally(() => setLoading(false));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function refreshProfile() {
    if (user) loadProfile(user);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
