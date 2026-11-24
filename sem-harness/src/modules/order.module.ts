import { Subscription } from 'rxjs';
import type { IEventBus } from '../bus/event-bus.js';
import type { Disposable, OrderInput, OrderCreatedEvent } from '../types/index.js';

export class OrderModule implements Disposable {
  private readonly subscription = new Subscription();

  constructor(private readonly eventBus: IEventBus) {}

  /**
   * Cria um pedido e publica o evento OrderCreated no EventBus.
   */
  public createOrder(order: OrderInput): void {
    const event: OrderCreatedEvent = {
      type: 'OrderCreated',
      payload: {
        orderId: order.id,
        item: order.item,
        quantity: order.quantity,
        totalAmount: order.totalAmount,
        ...(order.simulatePaymentError !== undefined
          ? { simulatePaymentError: order.simulatePaymentError }
          : {}),
      },
    };

    this.eventBus.publish(event);
  }

  public dispose(): void {
    this.subscription.unsubscribe();
  }
}
