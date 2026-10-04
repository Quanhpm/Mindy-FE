'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@/shared/api/contracts/identity';
import { ApiError, errorMessage } from '@/shared/lib/http/api-error';
import {
  completeGoogleRegistration,
  currentUser,
  login,
  logout,
  recoverSession,
  verifyEmail,
} from '../api/auth.browser';
import type { GoogleRegistrationInput } from '../schemas/google-registration.schema';
import type { LoginInput } from '../schemas/login.schema';
import { consumeGoogleSessionMarker } from './session-marker';
import { bindSessionIdentity, invalidateSessionScope } from './session-scope';

type SessionState = 'loading' | 'authenticated' | 'anonymous' | 'error';
type AnonymousReason = 'missing' | 'expired' | 'logout';
type SessionContextValue = {
  user: User | null;
  state: SessionState;
  error: string | null;
  anonymousReason: AnonymousReason | null;
  reload: () => Promise<void>;
  signIn: (input: LoginInput) => Promise<User>;
  confirmEmail: (token: string) => Promise<User>;
  completeRegistration: (input: GoogleRegistrationInput) => Promise<User>;
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
  const [anonymousReason, setAnonymousReason] = useState<AnonymousReason | null>(null);
  const generation = useRef(0);

  const clear = useCallback((reason: AnonymousReason) => {
    generation.current += 1;
    bindSessionIdentity(null);
    setUser(null);
    setState('anonymous');
    setError(null);
    setAnonymousReason(reason);
  }, []);

  const reload = useCallback(async () => {
    const version = ++generation.current;
    invalidateSessionScope();
    setState('loading');
    setError(null);
    setAnonymousReason(null);
    try {
      let identity: User;
      try {
        identity = await currentUser();
      } catch (cause) {
        if (!(cause instanceof ApiError) || cause.status !== 401) throw cause;
        identity = await recoverSession();
      }
      if (version !== generation.current) return;
      bindSessionIdentity(identity.id);
      setUser(identity);
      setState('authenticated');
      if (consumeGoogleSessionMarker()) announce('login');
    } catch (cause) {
      if (version !== generation.current) return;
      bindSessionIdentity(null);
      setUser(null);
      if (cause instanceof ApiError && cause.status === 401) {
        setState('anonymous');
        setAnonymousReason('missing');
      } else {
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
        if (event.data === 'logout') clear('logout');
        if (event.data === 'login') void reload();
      };
    const expired = () => clear('expired');
    const changed = () => void reload();
    window.addEventListener('mindy:session-expired', expired);
    window.addEventListener('mindy:session-changed', changed);
    return () => {
      generation.current += 1;
      invalidateSessionScope();
      channel?.close();
      window.removeEventListener('mindy:session-expired', expired);
      window.removeEventListener('mindy:session-changed', changed);
    };
  }, [clear, reload]);

  async function signIn(input: LoginInput): Promise<User> {
    const identity = await login(input);
    generation.current += 1;
    bindSessionIdentity(identity.id);
    setUser(identity);
    setState('authenticated');
    setError(null);
    setAnonymousReason(null);
    announce('login');
    return identity;
  }

  async function confirmEmail(token: string): Promise<User> {
    const identity = await verifyEmail(token);
    generation.current += 1;
    bindSessionIdentity(identity.id);
    setUser(identity);
    setState('authenticated');
    setError(null);
    setAnonymousReason(null);
    announce('login');
    return identity;
  }

  async function completeRegistration(input: GoogleRegistrationInput): Promise<User> {
    const identity = await completeGoogleRegistration(input);
    generation.current += 1;
    bindSessionIdentity(identity.id);
    setUser(identity);
    setState('authenticated');
    setError(null);
    setAnonymousReason(null);
    announce('login');
    return identity;
  }

  async function signOut(all = false): Promise<void> {
    try {
      await logout(all);
    } catch (cause) {
      if (!(cause instanceof ApiError) || cause.status !== 401) throw cause;
    }
    clear('logout');
    announce('logout');
  }

  return (
    <SessionContext.Provider
      value={{
        user,
        state,
        error,
        anonymousReason,
        reload,
        signIn,
        confirmEmail,
        completeRegistration,
        signOut,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession requires SessionProvider');
  return value;
}
