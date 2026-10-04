import { afterEach, describe, expect, it, vi } from 'vitest';
import { consumeGoogleSessionMarker } from './session-marker';

afterEach(() => vi.unstubAllGlobals());

describe('Google navigation session announcement marker', () => {
  it('consumes the fixed marker once while preserving URL parameters, hash and Next history state', () => {
    const state = { __NA: true, tree: ['account'] };
    const location = {
      href: 'https://mindy.example/management/users?page=2&mindyAuth=google#member',
    };
    const replaceState = vi.fn((_state: unknown, _title: string, url: string) => {
      location.href = new URL(url, location.href).href;
    });
    vi.stubGlobal('window', { location, history: { state, replaceState } });
    expect(consumeGoogleSessionMarker()).toBe(true);
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(
      state,
      '',
      '/management/users?page=2#member',
    );
    expect(consumeGoogleSessionMarker()).toBe(false);
  });
  it('ignores missing, unknown and duplicated markers', () => {
    for (const query of ['', '?mindyAuth=other', '?mindyAuth=google&mindyAuth=google']) {
      const replaceState = vi.fn();
      vi.stubGlobal('window', {
        location: { href: `https://mindy.example/account${query}` },
        history: { state: null, replaceState },
      });
      expect(consumeGoogleSessionMarker()).toBe(false);
      expect(replaceState).not.toHaveBeenCalled();
    }
  });
});
