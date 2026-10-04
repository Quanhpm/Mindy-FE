import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Ocean Editorial — Mindy',
  robots: { index: false, follow: false },
};
export default function Page() {
  redirect('/ui-lab/ocean-editorial/home');
}
