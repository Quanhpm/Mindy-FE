import type { UserRole } from '@/shared/api/contracts/identity';

export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'MANAGER';
}

export function homeForRole(role: UserRole): string {
  return canManageUsers(role) ? '/management/users' : '/account';
}

export function safeReturnTo(value: string | null, fallback: string): string {
  if (!value || !/^\/(account|management\/users)(\/|\?|$)/.test(value) || /[\\\r\n]/.test(value))
    return fallback;
  return value;
}
