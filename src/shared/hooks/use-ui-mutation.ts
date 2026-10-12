'use client';

import { useEffect, useRef, useState } from 'react';
import { errorMessage, unknownMutationResult } from '@/shared/lib/http/api-error';

/** Serializes UI actions and discards completions after unmount. Never replays writes. */
export function useUiMutation(describe: (cause: unknown) => string = errorMessage) {
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const uncertainRef = useRef(false);
  const verifiedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [uncertain, setUncertain] = useState(false);
  const [verification, setVerification] = useState<string>();

  useEffect(() => () => controller.current?.abort(), []);

  async function run<T>(
    action: (signal: AbortSignal) => Promise<T>,
    onSuccess: (result: T) => void,
    onFailure?: (
      cause: unknown,
      signal: AbortSignal,
    ) => Promise<void> | Promise<string | undefined>,
  ): Promise<T | null> {
    if (locked.current || uncertainRef.current) return null;
    locked.current = true;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError(undefined);
    setVerification(undefined);
    try {
      const result = await action(active.signal);
      if (active.signal.aborted) return null;
      onSuccess(result);
      return result;
    } catch (cause) {
      if (active.signal.aborted) return null;
      const unknown = unknownMutationResult(cause);
      uncertainRef.current = unknown;
      verifiedRef.current = false;
      setUncertain(unknown);
      setError(unknown ? `Kết quả thao tác chưa rõ. ${describe(cause)}` : describe(cause));
      try {
        const recovery = await onFailure?.(cause, active.signal);
        if (recovery && !active.signal.aborted) setError(`${describe(cause)} ${recovery}`);
      } catch (readError) {
        if (!active.signal.aborted) {
          uncertainRef.current = true;
          setUncertain(true);
          setError(`${describe(cause)} Chưa đọc lại được dữ liệu. ${describe(readError)}`);
        }
      }
      return null;
    } finally {
      locked.current = false;
      if (!active.signal.aborted) setBusy(false);
    }
  }

  async function check(read: (signal: AbortSignal) => Promise<string>): Promise<void> {
    if (locked.current || !uncertainRef.current) return;
    locked.current = true;
    const active = new AbortController();
    controller.current = active;
    verifiedRef.current = false;
    setBusy(true);
    setVerification(undefined);
    try {
      const result = await read(active.signal);
      if (active.signal.aborted) return;
      verifiedRef.current = true;
      setVerification(result);
    } catch (cause) {
      if (!active.signal.aborted) setError(`Chưa đọc lại được dữ liệu. ${describe(cause)}`);
    } finally {
      locked.current = false;
      if (!active.signal.aborted) setBusy(false);
    }
  }

  function acknowledge(): void {
    if (locked.current || !verifiedRef.current) return;
    uncertainRef.current = false;
    verifiedRef.current = false;
    setUncertain(false);
    setError(undefined);
    setVerification(undefined);
  }

  return {
    run,
    check,
    acknowledge,
    busy,
    error,
    uncertain,
    verification,
    blocked: busy || uncertain,
  };
}
