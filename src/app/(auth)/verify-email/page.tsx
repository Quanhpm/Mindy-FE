import type { Metadata } from 'next';
import { VerifyEmailForm } from '@/features/auth/client';
import { Brand } from '@/shared/ui/brand';

export const metadata: Metadata = {
  title: 'Xác thực email',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  return (
    <main id="main-content" className="login-page">
      <section className="login-story">
        <Brand inverse />
        <div className="story-copy">
          <h1>Xác thực email</h1>
          <p>Cùng Mindy bắt đầu hành trình học tập của bạn.</p>
        </div>
      </section>
      <section className="login-content">
        <div className="login-form-wrap">
          <h2>Xác thực email</h2>
          <VerifyEmailForm token={typeof params.token === 'string' ? params.token : null} />
        </div>
      </section>
    </main>
  );
}
