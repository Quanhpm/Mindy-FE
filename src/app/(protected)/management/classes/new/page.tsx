import type { Metadata } from 'next';
import { CreateClassForm } from '@/features/classes/client';

export const metadata: Metadata = { title: 'Tạo lớp học' };
export default function NewClassPage() {
  return <CreateClassForm />;
}
