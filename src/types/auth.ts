export type AppRole = 'admin' | 'gerente' | 'vendedor';
export type PlanType = 'pro' | 'essencial';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  tenant_id: string;
  plan_type: PlanType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  tenant_id?: string;
  created_at: string;
}

export interface UserWithRole extends Profile {
  role: AppRole | null;
}
