import Link from 'next/link';
import { Icon } from '@/shared/ui/icon';
import { previewHref, type VariantId } from '../data/variants';
import s from '../styles/exploration.module.css';

export function PreviewBrand({ variant }: { variant: VariantId }) {
  return (
    <Link
      href={previewHref(variant, 'home')}
      className={s.brand}
      aria-label="Mindy — trang chủ mẫu"
    >
      <span className={s.brandMark}>
        <Icon name="book" size={22} />
      </span>
      <span>
        mindy<span className={s.brandDot}>.</span>
      </span>
    </Link>
  );
}
