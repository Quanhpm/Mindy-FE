import type { Metadata } from 'next';
import { CreateUserForm } from '@/features/users/client';

export const metadata: Metadata = { title: 'Thêm người dùng' };
export default function NewUserPage() {
  return <CreateUserForm />;
}
