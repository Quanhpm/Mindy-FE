import type { Metadata } from 'next';
import { LoginForm } from '@/features/auth/client';
import { Brand } from '@/shared/ui/brand';
import { Icon } from '@/shared/ui/icon';

export const metadata: Metadata = { title: 'Đăng nhập' };

export default function LoginPage() {
  return (
    <main id="main-content" className="login-page">
      <section className="login-story">
        <Brand inverse />
        <div className="story-copy">
          <p className="eyebrow">GROW TOGETHER</p>
          <h1>
            Mỗi bước nhỏ.
            <br />
            Một tương lai
            <br />
            <span>rộng mở.</span>
          </h1>
          <p>
            Không gian kết nối học viên, mentor và những người đồng hành trên hành trình học tập.
          </p>
        </div>
        <div className="journey-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-card art-card-one">
            <span className="art-icon">
              <Icon name="book" size={27} />
            </span>
            <div>
              <strong>Học điều mới</strong>
              <span>Mở rộng góc nhìn mỗi ngày</span>
            </div>
          </div>
          <div className="art-card art-card-two">
            <span className="art-icon">
              <Icon name="check" size={24} />
            </span>
            <div>
              <strong>Tiến bộ cùng nhau</strong>
              <span>Từng bước một, cùng Mindy</span>
            </div>
          </div>
          <span className="art-spark">✳</span>
        </div>
        <p className="story-footer">
          MINDY CENTER<span>LEARN. CONNECT. GROW.</span>
        </p>
      </section>
      <section className="login-content">
        <span className="login-top-note">KHÔNG GIAN MINDY</span>
        <div className="login-form-wrap">
          <span className="welcome-icon">
            <Icon name="user" size={25} />
          </span>
          <h2>
            Chào mừng trở lại<span>!</span>
          </h2>
          <p className="login-subtitle">Đăng nhập để tiếp tục hành trình của bạn.</p>
          <LoginForm />
        </div>
        <p className="login-footer">Cùng nhau tiến bộ mỗi ngày.</p>
      </section>
    </main>
  );
}
