import Link from 'next/link';
import { Icon } from './icon';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand${inverse ? ' brand-inverse' : ''}`}
      aria-label="Mindy — trang chủ"
    >
      <span className="brand-mark">
        <Icon name="book" size={24} />
      </span>
      <span>
        mindy<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
