import { googleNavigation } from '@/features/auth/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return googleNavigation(request, 'start');
}
