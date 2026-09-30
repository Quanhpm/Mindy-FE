export function formatDate(value: string | null, includeTime = false): string {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}
