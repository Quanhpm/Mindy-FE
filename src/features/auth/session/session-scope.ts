export type SessionScope = Readonly<{ userId: string | null; generation: number }>;

let scope: SessionScope = { userId: null, generation: 0 };

// This is an in-memory request boundary, never a stored or authoritative session.
// The provider invalidates it synchronously before loading a different identity.
export function invalidateSessionScope(): void {
  scope = { userId: scope.userId, generation: scope.generation + 1 };
}

export function bindSessionIdentity(userId: string | null): void {
  scope = { userId, generation: scope.generation + 1 };
}

export function captureSessionScope(): SessionScope {
  return scope;
}

export function matchesSessionScope(expected: SessionScope): boolean {
  return expected.generation === scope.generation && expected.userId === scope.userId;
}
