// Explicit public client API. Users may depend on auth; auth never imports users.
export { authenticatedRequest } from './api/auth.browser';
export { AccountPanel } from './components/account-panel';
export { AuthBoundary } from './components/auth-boundary';
export { AuthPage } from './components/auth-page';
export { GoogleCallbackForm } from './components/google-callback-form';
export { GoogleRegistrationForm } from './components/google-registration-form';
export { LoginForm } from './components/login-form';
export { RegisterForm } from './components/register-form';
export { VerifyEmailForm } from './components/verify-email-form';
export { canManageUsers, canPurchaseClasses, safeReturnTo } from './permissions/access-policy';
export { SessionProvider, useSession } from './session/session-provider';
