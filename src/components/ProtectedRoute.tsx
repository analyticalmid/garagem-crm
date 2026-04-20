import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: AppRole[];
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { user, profile, role, isLoading } = useAuth();

  const isResolvingAccess = Boolean(user) && (!profile || !role);

  if (isLoading || isResolvingAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // User is inactive
  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Acesso Bloqueado</h1>
          <p className="text-muted-foreground">
            Usuário inativo. Contate um administrador.
          </p>
        </div>
      </div>
    );
  }

  if (!profile || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Acesso não configurado</h1>
          <p className="text-muted-foreground">
            Seu usuário ainda não possui perfil ou papel válido. Contate um administrador.
          </p>
        </div>
      </div>
    );
  }

  // Role-based access control
  if (requiredRoles && (!role || !requiredRoles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
