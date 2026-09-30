'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@/shared/api/contracts/identity';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import { currentUser, login, logout, recoverSession } from '../api/auth.browser';
import type { LoginInput } from '../schemas/login.schema';

type SessionState = 'loading' | 'authenticated' | 'anonymous' | 'error';
type SessionContextValue = {
  user: User | null;
  state: SessionState;
  error: string | null;
  reload: () => Promise<void>;
  signIn: (input: LoginInput) => Promise<User>;
  signOut: (all?: boolean) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function announce(type: 'login' | 'logout'): void {
  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel('mindy-session');
    channel.postMessage(type);
    channel.close();
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<SessionState>('loading');
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  const clear = useCallback(() => {
    generation.current += 1;
    setUser(null);
    setState('anonymous');
    setError(null);
  }, []);

  const reload = useCallback(async () => {
    const version = ++generation.current;
    setState('loading');
    setError(null);
    try {
      let identity: User;
      try {
        identity = await currentUser();
      } catch (cause) {
        if (!(cause instanceof ApiError) || cause.status !== 401) throw cause;
        identity = await recoverSession();
      }
      if (version !== generation.current) return;
      setUser(identity);
      setState('authenticated');
    } catch (cause) {
      if (version !== generation.current) return;
      setUser(null);
      if (cause instanceof ApiError && cause.status === 401) setState('anonymous');
      else {
        setState('error');
        setError(errorMessage(cause));
      }
    }
  }, []);

  useEffect(() => {
    void reload();
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('mindy-session') : null;
    if (channel)
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (event.data === 'logout') clear();
        if (event.data === 'login') void reload();
      };
    window.addEventListener('mindy:session-expired', clear);
    return () => {
      generation.current += 1;
      channel?.close();
      window.removeEventListener('mindy:session-expired', clear);
    };
  }, [clear, reload]);

  async function signIn(input: LoginInput): Promise<User> {
    const identity = await login(input);
    generation.current += 1;
    setUser(identity);
    setState('authenticated');
    setError(null);
    announce('login');
    return identity;
  }

  async function signOut(all = false): Promise<void> {
    try {
      await logout(all);
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.status !== 401) throw cause;
    }
    clear();
    announce('logout');
  }

  return (
    <SessionContext.Provider value={{ user, state, error, reload, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession requires SessionProvider');
  return value;
}
