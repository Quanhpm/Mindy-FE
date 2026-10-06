import type { Metadata } from 'next';
import { LearnthruDashboard } from '@/features/learnthru/client';

export const metadata: Metadata = { title: 'Learnthru — Dashboard' };

export default function LearnthruPage() {
  return <LearnthruDashboard />;
}
