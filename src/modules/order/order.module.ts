import { Subscription } from 'rxjs';
import type { EventBus } from '../../shared/event-bus.js';
import type { OrderCreatedEvent, OrderCreatedPayload } from '../../shared/events.js';

export interface CreateOrderDTO {
  readonly id: string;
  readonly item: string;
  readonly quantity: number;
  readonly totalAmount: number;
  readonly simulatePaymentError?: boolean | undefined;
}

export class OrderModule {
  private readonly subscriptions = new Subscription();

  constructor(private readonly eventBus: EventBus) {}

  createOrder(order: CreateOrderDTO): void {
    const payload: OrderCreatedPayload = {
      id: order.id,
      orderId: order.id,
      item: order.item,
      quantity: order.quantity,
      totalAmount: order.totalAmount,
      ...(order.simulatePaymentError !== undefined
        ? { simulatePaymentError: order.simulatePaymentError }
        : {}),
    };

    const event: OrderCreatedEvent = {
      type: 'OrderCreated',
      payload,
      timestamp: Date.now(),
    };

    this.eventBus.publish(event);
  }

  dispose(): void {
    this.subscriptions.unsubscribe();
  }
}
