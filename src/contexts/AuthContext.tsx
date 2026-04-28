import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile, AppRole, PlanType } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  planType: PlanType | null;
  tenantId: string | null;
  isLoading: boolean;
  isAdmin: boolean;
  isGerente: boolean;
  isVendedor: boolean;
  isPro: boolean;
  isEssencial: boolean;
  canManageUsers: boolean;
  canAssignLeads: boolean;
  canViewAllLeads: boolean;
  canUseEssencialFeatures: boolean;
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
  const planType = profile?.plan_type ?? null;
  const tenantId = profile?.tenant_id ?? null;
  const isPro = planType === 'pro';
  const isEssencial = planType === 'essencial';
  // Apenas admin pode gerenciar usuários
  const canManageUsers = isAdmin;
  const canAssignLeads = isAdmin || isGerente;
  const canViewAllLeads = isAdmin || isGerente;
  const canUseEssencialFeatures = isEssencial || isAdmin || isGerente;

  const initializedRef = useRef(false);

  const fetchProfileAndRole = async (
    accessToken: string | null | undefined,
    options: { clearOnFailure?: boolean } = {},
  ) => {
    const { clearOnFailure = false } = options;

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
        if (clearOnFailure) {
          setProfile(null);
          setRole(null);
        }
        return;
      }

      const data = await response.json();
      setProfile(data.profile as Profile);
      setRole(data.role as AppRole || null);
    } catch {
      if (clearOnFailure) {
        setProfile(null);
        setRole(null);
      }
    }
  };

  const refreshAccessState = async (nextSession: Session | null, options?: { clearOnFailure?: boolean }) => {
    await fetchProfileAndRole(nextSession?.access_token, options);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_OUT' || !session?.user) {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
          return;
        }

        // Keep the full-screen loader only for the first access resolution.
        if (!initializedRef.current) {
          setIsLoading(true);
        }

        // Defer Supabase calls with setTimeout to avoid deadlock.
        setTimeout(() => {
          void refreshAccessState(session, { clearOnFailure: !initializedRef.current }).finally(() => {
            initializedRef.current = true;
            setIsLoading(false);
          });
        }, 0);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setIsLoading(true);
        refreshAccessState(session, { clearOnFailure: true }).finally(() => {
          initializedRef.current = true;
          setIsLoading(false);
        });
        } else {
          setProfile(null);
          setRole(null);
          setIsLoading(false);
        }
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          void refreshAccessState(session);
        }
      });
    };

    const refreshInterval = window.setInterval(() => {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          void refreshAccessState(session);
        }
      });
    }, 60000);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(refreshInterval);
    };
  }, []);

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
        planType,
        tenantId,
        isLoading,
        isAdmin,
        isGerente,
        isVendedor,
        isPro,
        isEssencial,
        canManageUsers,
        canAssignLeads,
        canViewAllLeads,
        canUseEssencialFeatures,
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
