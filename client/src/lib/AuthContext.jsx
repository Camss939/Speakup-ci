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
    // Retry up to 5 times with 500ms delay — gives the DB trigger time to complete
    for (let i = 0; i < 5; i++) {
      try {
        const p = await getProfile(authUser.id);
        setProfile(p ?? null);
        return;
      } catch (e) {
        if (i === 4) { console.error('[auth] getProfile failed:', e.message); setProfile(null); }
        else await new Promise(r => setTimeout(r, 500));
      }
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
