import { AuthBoundary } from '@/features/auth/client';

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return <AuthBoundary management>{children}</AuthBoundary>;
}
