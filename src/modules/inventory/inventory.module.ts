import { type Observable, Subscription, catchError, concatMap, defer, of } from 'rxjs';
import type { EventBus } from '../../shared/event-bus.js';
import type {
  OrderCreatedEvent,
  OrderCreatedPayload,
  OrderFailedEvent,
  StockReservedEvent,
} from '../../shared/events.js';

export class InventoryModule {
  private readonly stock = new Map<string, number>();
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly eventBus: EventBus,
    initialStock: Record<string, number> = { notebook: 5, mouse: 10, teclado: 2 },
  ) {
    for (const [item, qty] of Object.entries(initialStock)) {
      this.stock.set(item, qty);
    }
    this.init();
  }

  private init(): void {
    const sub = this.eventBus
      .on<OrderCreatedEvent>('OrderCreated')
      .pipe(
        concatMap((event) => {
          return this.processOrder(event.payload).pipe(
            catchError((err: unknown) => {
              const errorEvent: OrderFailedEvent = {
                type: 'OrderFailed',
                payload: {
                  id: event.payload.id,
                  orderId: event.payload.orderId,
                  reason: err instanceof Error ? err.message : 'OUT_OF_STOCK',
                },
                timestamp: Date.now(),
              };
              return of(errorEvent);
            }),
          );
        }),
      )
      .subscribe((resultEvent) => {
        this.eventBus.publish(resultEvent);
      });

    this.subscriptions.add(sub);
  }

  private processOrder(
    payload: OrderCreatedPayload,
  ): Observable<StockReservedEvent | OrderFailedEvent> {
    return defer(() => {
      const currentStock = this.stock.get(payload.item) ?? 0;
      if (currentStock >= payload.quantity) {
        this.stock.set(payload.item, currentStock - payload.quantity);
        const reservedEvent: StockReservedEvent = {
          type: 'StockReserved',
          payload: {
            id: payload.id,
            orderId: payload.orderId,
            item: payload.item,
            quantity: payload.quantity,
            totalAmount: payload.totalAmount,
            ...(payload.simulatePaymentError !== undefined
              ? { simulatePaymentError: payload.simulatePaymentError }
              : {}),
          },
          timestamp: Date.now(),
        };
        return of(reservedEvent);
      }

      const failedEvent: OrderFailedEvent = {
        type: 'OrderFailed',
        payload: {
          id: payload.id,
          orderId: payload.orderId,
          reason: 'OUT_OF_STOCK',
        },
        timestamp: Date.now(),
      };
      return of(failedEvent);
    });
  }

  getStock(item: string): number {
    return this.stock.get(item) ?? 0;
  }

  getAllStock(): Record<string, number> {
    return Object.fromEntries(this.stock.entries());
  }

  dispose(): void {
    this.subscriptions.unsubscribe();
  }
}
