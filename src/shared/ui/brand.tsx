import Image from 'next/image';
import Link from 'next/link';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand${inverse ? ' brand-inverse' : ''}`}
      aria-label="Mindy — trang chủ"
    >
      <Image className="brand-logo" src="/brand/mindy-logo.jpg" width={56} height={56} alt="" />
      <span className="brand-name">
        Mindy<span className="brand-caption">Coding</span>
      </span>
    </Link>
  );
}
