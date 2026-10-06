import type { UserRole } from '@/shared/api/contracts/identity';

export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMIN';
}

export function canPurchaseClasses(role: UserRole): boolean {
  return role === 'STUDENT';
}

export function homeForRole(role: UserRole): string {
  return canManageUsers(role) ? '/management/users' : '/account';
}

export function safeReturnTo(value: string | null, fallback: string): string {
  if (!value || value.length > 500 || hasUnsafeUrlCharacters(value)) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (hasUnsafeUrlCharacters(decoded) || !/^\/(?!\/)/.test(decoded)) return fallback;
    const url = new URL(value, 'https://mindy.invalid');
    if (url.origin !== 'https://mindy.invalid') return fallback;
    const id = '[a-f\\d]{8}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{4}-[a-f\\d]{12}';
    const accepted = new RegExp(
      `^/(?:account|cart|checkout|orders(?:/${id})?|payment/result|mentor/cash-orders|learning/classes/${id}(?:/preview)?|courses(?:/${id}(?:/units/${id})?)?|classes/${id}|management/payments/reconciliation|management/(?:users|course-categories|courses|classes)(?:/(?:new|${id}))?)$`,
      'i',
    );
    if (!accepted.test(url.pathname)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function hasUnsafeUrlCharacters(value: string): boolean {
  return [...value].some(
    (character) =>
      character === '\\' || character.charCodeAt(0) <= 32 || character.charCodeAt(0) === 127,
  );
}
