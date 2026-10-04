import { CartPreviewProvider } from '@/features/ui-exploration/client';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CartPreviewProvider>{children}</CartPreviewProvider>;
}
