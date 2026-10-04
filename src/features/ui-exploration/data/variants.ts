export const variants = [
  {
    id: 'ocean-editorial',
    number: '07',
    name: 'Ocean Editorial',
    mood: 'Mỗi hành trình, một câu chuyện.',
    description: 'Bố cục tạp chí với cột mục lục và typography lớn.',
    primary: '#164E73',
    soft: '#EAF4FB',
    layout: 'Magazine cover · admin ba cột',
  },
] as const;
export type VariantId = (typeof variants)[number]['id'];
export const views = ['home', 'courses', 'cart', 'login', 'register', 'admin'] as const;
export type PreviewView = (typeof views)[number];
export const viewLabels: Record<PreviewView, string> = {
  home: 'Trang chủ',
  courses: 'Khóa học',
  cart: 'Giỏ hàng',
  login: 'Login',
  register: 'Register',
  admin: 'Admin',
};
export type PreviewState = 'default' | 'error' | 'submitting' | 'notice' | 'loading' | 'empty';
export function isVariant(value: string): value is VariantId {
  return variants.some((variant) => variant.id === value);
}
export function isView(value: string): value is PreviewView {
  return views.some((view) => view === value);
}
export function allowedStates(view: PreviewView): PreviewState[] {
  if (view === 'admin') return ['default', 'loading', 'empty', 'error'];
  if (view === 'login' || view === 'register') return ['default', 'error', 'submitting', 'notice'];
  return ['default'];
}
export function resolveState(value: string | undefined, view: PreviewView): PreviewState {
  return allowedStates(view).find((state) => state === value) ?? 'default';
}
export function previewHref(variant: VariantId, view: PreviewView): string {
  return `/ui-lab/${variant}/${view}`;
}
