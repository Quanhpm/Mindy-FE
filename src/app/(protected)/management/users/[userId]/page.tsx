import { notFound } from 'next/navigation';
import { z } from 'zod';
import { UserDetail } from '@/features/users/client';

export const metadata = { title: 'Chi tiết người dùng' };
export default async function UserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!z.uuid().safeParse(userId).success) notFound();
  return <UserDetail id={userId} />;
}
