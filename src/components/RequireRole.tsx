import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/types/auth';

interface RequireRoleProps {
  roles: AppRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { role } = useAuth();

  if (!role || !roles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
