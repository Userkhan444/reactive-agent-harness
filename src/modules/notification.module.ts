import { Subscription, merge } from 'rxjs';
import { map } from 'rxjs/operators';
import type { IEventBus } from '../bus/event-bus.js';
import type { Disposable, NotificationRecord } from '../types/index.js';

export class NotificationModule implements Disposable {
  private readonly history: NotificationRecord[] = [];
  private readonly subscription = new Subscription();

  constructor(private readonly eventBus: IEventBus) {
    this.init();
  }

  private init(): void {
    const paymentApproved$ = this.eventBus.ofType('PaymentApproved').pipe(
      map(
        (event): NotificationRecord => ({
          orderId: event.payload.orderId,
          status: 'APPROVED',
          eventType: 'PaymentApproved',
          timestamp: new Date(),
          details: { totalAmount: event.payload.totalAmount },
        })
      )
    );

    const paymentFailed$ = this.eventBus.ofType('PaymentFailed').pipe(
      map(
        (event): NotificationRecord => ({
          orderId: event.payload.orderId,
          status: 'FAILED',
          eventType: 'PaymentFailed',
          reason: event.payload.reason,
          timestamp: new Date(),
        })
      )
    );

    const orderFailed$ = this.eventBus.ofType('OrderFailed').pipe(
      map(
        (event): NotificationRecord => ({
          orderId: event.payload.orderId,
          status: 'FAILED',
          eventType: 'OrderFailed',
          reason: event.payload.reason,
          timestamp: new Date(),
          ...(event.payload.item !== undefined || event.payload.quantity !== undefined
            ? {
                details: {
                  ...(event.payload.item !== undefined ? { item: event.payload.item } : {}),
                  ...(event.payload.quantity !== undefined ? { quantity: event.payload.quantity } : {}),
                },
              }
            : {}),
        })
      )
    );

    const sub = merge(paymentApproved$, paymentFailed$, orderFailed$).subscribe({
      next: (record) => {
        this.history.push(record);
      },
      error: (err) => {
        console.error('[NotificationModule] Stream error:', err);
      },
    });

    this.subscription.add(sub);
  }

  public getHistory(): ReadonlyArray<NotificationRecord> {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history.length = 0;
  }

  public dispose(): void {
    this.subscription.unsubscribe();
  }
}
