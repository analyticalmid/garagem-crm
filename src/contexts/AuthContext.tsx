import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isGerente: boolean;
  isVendedor: boolean;
  canManageUsers: boolean;
  canAssignLeads: boolean;
  canViewAllLeads: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derived permissions
  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente';
  const isVendedor = role === 'vendedor';
  // Apenas admin pode gerenciar usuários
  const canManageUsers = isAdmin;
  const canAssignLeads = isAdmin || isGerente;
  const canViewAllLeads = isAdmin || isGerente;

  const fetchProfileAndRole = async (accessToken: string | null | undefined) => {
    try {
      if (!accessToken) {
        setProfile(null);
        setRole(null);
        return;
      }

      const response = await fetch('/api/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        setProfile(null);
        setRole(null);
        return;
      }

      const data = await response.json();
      setProfile(data.profile as Profile);
      setRole(data.role as AppRole || null);
    } catch {
      setProfile(null);
      setRole(null);
    }
  };

  const refreshAccessState = async (nextSession: Session | null) => {
    await fetchProfileAndRole(nextSession?.access_token);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout to avoid deadlock
        if (session?.user) {
          setIsLoading(true);
          setTimeout(() => {
            void refreshAccessState(session).finally(() => {
              setIsLoading(false);
            });
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        refreshAccessState(session).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session?.user?.id) {
        void refreshAccessState(session);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const refreshInterval = window.setInterval(() => {
      if (session?.user?.id) {
        void refreshAccessState(session);
      }
    }, 60000);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(refreshInterval);
    };
  }, [session?.user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const refreshProfile = async () => {
    if (!session?.access_token) return;
    await refreshAccessState(session);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isLoading,
        isAdmin,
        isGerente,
        isVendedor,
        canManageUsers,
        canAssignLeads,
        canViewAllLeads,
        signIn,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
