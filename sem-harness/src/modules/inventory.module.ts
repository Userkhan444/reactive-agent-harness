import { Observable, Subscription, of } from 'rxjs';
import { concatMap, map, catchError } from 'rxjs/operators';
import type { IEventBus } from '../bus/event-bus.js';
import type {
  Disposable,
  OrderCreatedEvent,
  StockReservedEvent,
  OrderFailedEvent,
} from '../types/index.js';

export class InventoryModule implements Disposable {
  private readonly stock = new Map<string, number>();
  private readonly subscription = new Subscription();

  constructor(
    private readonly eventBus: IEventBus,
    initialStock: Record<string, number> = { notebook: 5, mouse: 10, teclado: 2 }
  ) {
    for (const [item, qty] of Object.entries(initialStock)) {
      this.stock.set(item, qty);
    }
    this.init();
  }

  private init(): void {
    const sub = this.eventBus
      .ofType('OrderCreated')
      .pipe(concatMap((event) => this.processOrder(event)))
      .subscribe({
        next: (resultEvent) => {
          this.eventBus.publish(resultEvent);
        },
        error: (err) => {
          console.error('[InventoryModule] Stream error:', err);
        },
      });

    this.subscription.add(sub);
  }

  private processOrder(
    event: OrderCreatedEvent
  ): Observable<StockReservedEvent | OrderFailedEvent> {
    return of(event).pipe(
      map((ev) => {
        const { orderId, item, quantity, totalAmount, simulatePaymentError } = ev.payload;
        const currentStock = this.stock.get(item) ?? 0;

        if (currentStock >= quantity) {
          // Debita a quantidade do estoque
          this.stock.set(item, currentStock - quantity);

          const reservedEvent: StockReservedEvent = {
            type: 'StockReserved',
            payload: {
              orderId,
              item,
              quantity,
              totalAmount,
              ...(simulatePaymentError !== undefined ? { simulatePaymentError } : {}),
            },
          };
          return reservedEvent;
        }

        const failedEvent: OrderFailedEvent = {
          type: 'OrderFailed',
          payload: {
            orderId,
            reason: 'OUT_OF_STOCK',
            item,
            quantity,
          },
        };
        return failedEvent;
      }),
      catchError((err: unknown) => {
        const reason = err instanceof Error ? err.message : 'INVENTORY_ERROR';
        const failedEvent: OrderFailedEvent = {
          type: 'OrderFailed',
          payload: {
            orderId: event.payload.orderId,
            reason,
            item: event.payload.item,
            quantity: event.payload.quantity,
          },
        };
        return of(failedEvent);
      })
    );
  }

  public getStock(item: string): number {
    return this.stock.get(item) ?? 0;
  }

  public getAllStock(): Record<string, number> {
    return Object.fromEntries(this.stock.entries());
  }

  public dispose(): void {
    this.subscription.unsubscribe();
  }
}
