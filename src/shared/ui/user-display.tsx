import {
  roleLabels,
  statusLabels,
  type UserRole,
  type UserStatus,
} from '@/shared/api/contracts/identity';

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
  return (
    <span className={`avatar${large ? ' avatar-large' : ''}`} aria-hidden="true">
      {initials || 'M'}
    </span>
  );
}
export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={`badge role-${role.toLowerCase()}`}>{roleLabels[role]}</span>;
}
export function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <span />
      {statusLabels[status]}
    </span>
  );
}
