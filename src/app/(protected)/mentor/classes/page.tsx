import { Suspense } from 'react';
import { MentorClassesPage } from '@/features/classes/client';
export default function Page() {
  return (
    <Suspense>
      <MentorClassesPage />
    </Suspense>
  );
}
