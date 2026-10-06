import '@fontsource-variable/nunito';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { themeVariables } from '@/shared/config/theme';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Mindy — Cùng nhau tiến bộ', template: '%s | Mindy' },
  description: 'Không gian học tập và quản lý của Mindy Center.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={GeistSans.variable} style={themeVariables()}>
      <body>
        <a className="skip-link" href="#main-content">
          Đến nội dung chính
        </a>
        {children}
      </body>
    </html>
  );
}
