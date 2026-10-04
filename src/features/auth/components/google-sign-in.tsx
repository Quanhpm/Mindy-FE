'use client';

import { useEffect, useState } from 'react';
import { safeReturnTo } from '../permissions/access-policy';

export function GoogleSignIn({ disabled = false }: { disabled?: boolean }) {
  const [href, setHref] = useState('/api/v1/auth/google?returnTo=%2Faccount');
  useEffect(() => {
    const next = safeReturnTo(new URLSearchParams(window.location.search).get('next'), '/account');
    setHref(`/api/v1/auth/google?${new URLSearchParams({ returnTo: next })}`);
  }, []);
  return (
    <>
      <span className="form-divider">hoặc</span>
      <a
        className="button button-secondary button-full"
        href={disabled ? undefined : href}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
      >
        Tiếp tục với Google
      </a>
    </>
  );
}
