import { type Observable, Subscription, catchError, concatMap, defer, of } from 'rxjs';
import type { EventBus } from '../../shared/event-bus.js';
import type {
  PaymentApprovedEvent,
  PaymentFailedEvent,
  StockReservedEvent,
  StockReservedPayload,
} from '../../shared/events.js';

export class PaymentModule {
  private readonly subscriptions = new Subscription();

  constructor(private readonly eventBus: EventBus) {
    this.init();
  }

  private init(): void {
    const sub = this.eventBus
      .on<StockReservedEvent>('StockReserved')
      .pipe(
        concatMap((event) => {
          return this.processPayment(event.payload).pipe(
            catchError((_err: unknown) => {
              const failedEvent: PaymentFailedEvent = {
                type: 'PaymentFailed',
                payload: {
                  id: event.payload.id,
                  orderId: event.payload.orderId,
                  reason: 'GATEWAY_ERROR',
                },
                timestamp: Date.now(),
              };
              return of(failedEvent);
            }),
          );
        }),
      )
      .subscribe((resultEvent) => {
        this.eventBus.publish(resultEvent);
      });

    this.subscriptions.add(sub);
  }

  private processPayment(
    payload: StockReservedPayload,
  ): Observable<PaymentApprovedEvent | PaymentFailedEvent> {
    return defer(() => {
      if (payload.simulatePaymentError) {
        throw new Error('Simulated payment gateway timeout');
      }

      if (payload.totalAmount > 1000) {
        const failedEvent: PaymentFailedEvent = {
          type: 'PaymentFailed',
          payload: {
            id: payload.id,
            orderId: payload.orderId,
            reason: 'LIMIT_EXCEEDED',
          },
          timestamp: Date.now(),
        };
        return of(failedEvent);
      }

      const approvedEvent: PaymentApprovedEvent = {
        type: 'PaymentApproved',
        payload: {
          id: payload.id,
          orderId: payload.orderId,
          totalAmount: payload.totalAmount,
        },
        timestamp: Date.now(),
      };
      return of(approvedEvent);
    });
  }

  dispose(): void {
    this.subscriptions.unsubscribe();
  }
}
