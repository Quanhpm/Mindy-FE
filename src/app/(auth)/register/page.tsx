import type { Metadata } from 'next';
import { RegisterForm } from '@/features/auth/client';
import { Brand } from '@/shared/ui/brand';

export const metadata: Metadata = {
  title: 'Tạo tài khoản',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export default async function Page() {
  return (
    <main id="main-content" className="login-page">
      <section className="login-story">
        <Brand inverse />
        <div className="story-copy">
          <h1>Tạo tài khoản</h1>
          <p>Cùng Mindy bắt đầu hành trình học tập của bạn.</p>
        </div>
      </section>
      <section className="login-content">
        <div className="login-form-wrap">
          <h2>Tạo tài khoản</h2>
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
