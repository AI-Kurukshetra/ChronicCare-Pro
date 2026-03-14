import type { User } from '@supabase/supabase-js';

export type AppRole = 'patient' | 'doctor' | 'admin';

const roleToDashboard: Record<AppRole, string> = {
  patient: '/patient/dashboard',
  doctor: '/doctor/dashboard',
  admin: '/admin/dashboard'
};

const prefixToRole: Array<{ prefix: string; role: AppRole }> = [
  { prefix: '/patient', role: 'patient' },
  { prefix: '/doctor', role: 'doctor' },
  { prefix: '/admin', role: 'admin' }
];

export function isAppRole(value: unknown): value is AppRole {
  return value === 'patient' || value === 'doctor' || value === 'admin';
}

export function getUserRole(user: User | null): AppRole | null {
  if (!user) {
    return null;
  }

  const roleFromAppMetadata = user.app_metadata?.role;
  if (isAppRole(roleFromAppMetadata)) {
    return roleFromAppMetadata;
  }

  const roleFromUserMetadata = user.user_metadata?.role;
  if (isAppRole(roleFromUserMetadata)) {
    return roleFromUserMetadata;
  }

  return null;
}

export function getDashboardPathByRole(role: AppRole) {
  return roleToDashboard[role];
}

export function getRequiredRoleForPath(pathname: string): AppRole | null {
  for (const item of prefixToRole) {
    if (pathname.startsWith(item.prefix)) {
      return item.role;
    }
  }

  return null;
}
