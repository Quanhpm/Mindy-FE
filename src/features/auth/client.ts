// Explicit public client API. Users may depend on auth; auth never imports users.
export { authenticatedRequest } from './api/auth.browser';
export { AccountPanel } from './components/account-panel';
export { AuthBoundary } from './components/auth-boundary';
export { LoginForm } from './components/login-form';
export { RegisterForm } from './components/register-form';
export { VerifyEmailForm } from './components/verify-email-form';
export { canManageUsers } from './permissions/access-policy';
export { SessionProvider, useSession } from './session/session-provider';
