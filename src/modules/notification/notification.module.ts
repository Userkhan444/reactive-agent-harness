import { Subscription, merge } from 'rxjs';
import type { EventBus } from '../../shared/event-bus.js';
import type {
  OrderFailedEvent,
  PaymentApprovedEvent,
  PaymentFailedEvent,
} from '../../shared/events.js';

export type NotificationStatus = 'APPROVED' | 'PAYMENT_FAILED' | 'ORDER_FAILED';

export interface NotificationRecord {
  readonly id: string;
  readonly orderId: string;
  readonly status: NotificationStatus;
  readonly eventType: 'PaymentApproved' | 'PaymentFailed' | 'OrderFailed';
  readonly reason?: string | undefined;
  readonly timestamp: number;
}

export class NotificationModule {
  private readonly history: NotificationRecord[] = [];
  private readonly subscriptions = new Subscription();

  constructor(private readonly eventBus: EventBus) {
    this.init();
  }

  private init(): void {
    const sub = merge(
      this.eventBus.on<PaymentApprovedEvent>('PaymentApproved'),
      this.eventBus.on<PaymentFailedEvent>('PaymentFailed'),
      this.eventBus.on<OrderFailedEvent>('OrderFailed'),
    ).subscribe((event) => {
      if (event.type === 'PaymentApproved') {
        this.history.push({
          id: event.payload.id,
          orderId: event.payload.orderId,
          status: 'APPROVED',
          eventType: 'PaymentApproved',
          timestamp: event.timestamp,
        });
      } else if (event.type === 'PaymentFailed') {
        this.history.push({
          id: event.payload.id,
          orderId: event.payload.orderId,
          status: 'PAYMENT_FAILED',
          eventType: 'PaymentFailed',
          reason: event.payload.reason,
          timestamp: event.timestamp,
        });
      } else if (event.type === 'OrderFailed') {
        this.history.push({
          id: event.payload.id,
          orderId: event.payload.orderId,
          status: 'ORDER_FAILED',
          eventType: 'OrderFailed',
          reason: event.payload.reason,
          timestamp: event.timestamp,
        });
      }
    });

    this.subscriptions.add(sub);
  }

  getHistory(): readonly NotificationRecord[] {
    return [...this.history];
  }

  getRecord(orderId: string): NotificationRecord | undefined {
    return this.history.find((record) => record.orderId === orderId || record.id === orderId);
  }

  dispose(): void {
    this.subscriptions.unsubscribe();
  }
}
