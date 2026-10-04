import type { Cart } from '@/features/cart/client';
import type { Order, OrderPage, PaymentType } from '../schemas/order.schema';
import { isUnknownCheckoutResult, orderErrorMessage } from './order-display';

export type CheckoutPhase =
  | 'loading'
  | 'ready'
  | 'submitting'
  | 'checking'
  | 'unknown'
  | 'retryable'
  | 'success'
  | 'recovered'
  | 'error';
export type CheckoutState = {
  phase: CheckoutPhase;
  cart: Cart | null;
  orders: Order[];
  observedOrders: Order[];
  message: string | null;
};
export const initialCheckoutState: CheckoutState = {
  phase: 'loading',
  cart: null,
  orders: [],
  observedOrders: [],
  message: null,
};
type Dependencies = {
  getCart: (signal: AbortSignal) => Promise<Cart>;
  recentOrders: (signal: AbortSignal) => Promise<OrderPage>;
  checkout: (paymentType: PaymentType, signal: AbortSignal) => Promise<Order[]>;
};

/** Owns one mounted student's flow. A new identity creates a fresh instance. */
export class CheckoutFlow {
  private state: CheckoutState = initialCheckoutState;
  private baseline = new Set<string>();
  private latestOrderIds = new Set<string>();
  private attemptedClassIds = new Set<string>();
  private attemptedPayment: PaymentType = 'CASH';
  private controller = new AbortController();
  private disposed = false;

  constructor(
    private readonly api: Dependencies,
    private readonly changed: (state: CheckoutState) => void,
  ) {}

  private publish(update: Partial<CheckoutState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...update };
    this.changed(this.state);
  }
  dispose(): void {
    this.disposed = true;
    this.controller.abort();
  }
  async load(): Promise<void> {
    if (this.disposed || !['loading', 'ready', 'error'].includes(this.state.phase)) return;
    this.publish({ phase: 'loading', message: null });
    try {
      const [cart, orders] = await Promise.all([
        this.api.getCart(this.controller.signal),
        this.api.recentOrders(this.controller.signal),
      ]);
      if (this.disposed) return;
      this.baseline = new Set(orders.items.map((order) => order.id));
      this.latestOrderIds = this.baseline;
      this.publish({ phase: 'ready', cart, orders: [], observedOrders: [] });
    } catch (cause) {
      this.publish({ phase: 'error', message: orderErrorMessage(cause) });
    }
  }
  async submit(paymentType: PaymentType): Promise<void> {
    if (
      this.disposed ||
      !['ready', 'retryable'].includes(this.state.phase) ||
      !this.state.cart?.items.length ||
      this.state.cart.items.some((item) => !item.isPurchasable)
    )
      return;
    this.attemptedClassIds = new Set(this.state.cart.items.map((item) => item.classId));
    this.baseline = this.latestOrderIds;
    this.attemptedPayment = paymentType;
    this.publish({ phase: 'submitting', message: null, observedOrders: [] });
    try {
      const orders = await this.api.checkout(paymentType, this.controller.signal);
      if (this.disposed) return;
      this.publish({ phase: 'success', orders });
      // Keep the authoritative receipt even if the subsequent cart refresh fails.
      try {
        const cart = await this.api.getCart(this.controller.signal);
        this.publish({ cart });
      } catch {
        this.publish({
          message:
            'Đơn đã được tạo. Chưa thể đọc lại giỏ hàng; bạn có thể kiểm tra trong trang Giỏ hàng.',
        });
      }
    } catch (cause) {
      if (this.disposed) return;
      if (isUnknownCheckoutResult(cause)) {
        this.publish({
          phase: 'unknown',
          message:
            'Chưa xác định được kết quả tạo đơn. Hệ thống sẽ đọc lại đơn và giỏ hàng trước khi cho phép thử lại.',
        });
        await this.reconcile();
      } else {
        this.publish({ phase: 'checking', message: orderErrorMessage(cause) });
        try {
          const [cart, orders] = await Promise.all([
            this.api.getCart(this.controller.signal),
            this.api.recentOrders(this.controller.signal),
          ]);
          if (this.disposed) return;
          this.baseline = new Set(orders.items.map((order) => order.id));
          this.latestOrderIds = this.baseline;
          this.publish({ phase: 'ready', cart });
        } catch {
          this.publish({
            phase: 'error',
            message: 'Chưa thể đọc lại giỏ hàng sau lỗi tạo đơn. Vui lòng thử tải lại.',
          });
        }
      }
    }
  }
  async reconcile(): Promise<void> {
    if (this.disposed || !['unknown', 'retryable'].includes(this.state.phase)) return;
    this.publish({ phase: 'checking' });
    try {
      const [cart, recent] = await Promise.all([
        this.api.getCart(this.controller.signal),
        this.api.recentOrders(this.controller.signal),
      ]);
      if (this.disposed) return;
      const related = recent.items.filter(
        (order) =>
          !this.baseline.has(order.id) &&
          order.paymentType === this.attemptedPayment &&
          order.details.some((detail) => this.attemptedClassIds.has(detail.classId)),
      );
      const covered = new Set(
        related.flatMap((order) => order.details.map((detail) => detail.classId)),
      );
      const expectedStillInCart = cart.items.some((item) =>
        this.attemptedClassIds.has(item.classId),
      );
      if (
        related.length &&
        [...this.attemptedClassIds].every((id) => covered.has(id)) &&
        !expectedStillInCart
      ) {
        this.publish({
          phase: 'recovered',
          cart,
          orders: related,
          observedOrders: related,
          message:
            'Đã tìm thấy các đơn liên quan trong lịch sử của bạn. Hãy xem đủ các đơn và trạng thái được hệ thống trả về.',
        });
        return;
      }
      const unchangedCart =
        cart.items.length === this.attemptedClassIds.size &&
        cart.items.every((item) => this.attemptedClassIds.has(item.classId) && item.isPurchasable);
      this.latestOrderIds = new Set(recent.items.map((order) => order.id));
      this.publish({
        phase: unchangedCart && related.length === 0 ? 'retryable' : 'unknown',
        cart,
        observedOrders: related.length ? related : recent.items.slice(0, 5),
        message:
          unchangedCart && related.length === 0
            ? 'Đã đọc lại đơn và giỏ hàng, chưa thấy đơn mới liên quan. Kiểm tra lịch sử đơn trước khi chủ động tạo lại.'
            : 'Giỏ hàng hoặc lịch sử đơn đã thay đổi. Kết quả vẫn chưa xác định; hãy kiểm tra các đơn của bạn, không gửi lại ngay.',
      });
    } catch {
      this.publish({
        phase: 'unknown',
        message:
          'Chưa đọc đủ đơn và giỏ hàng để xác định kết quả. Vui lòng kiểm tra lại; thao tác tạo đơn đang bị khóa.',
      });
    }
  }
}
