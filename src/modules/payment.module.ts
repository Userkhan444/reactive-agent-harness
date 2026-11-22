import { Observable, Subscription, of } from 'rxjs';
import { concatMap, map, catchError } from 'rxjs/operators';
import type { IEventBus } from '../bus/event-bus.js';
import type {
  Disposable,
  StockReservedEvent,
  PaymentApprovedEvent,
  PaymentFailedEvent,
} from '../types/index.js';

export class PaymentModule implements Disposable {
  private readonly subscription = new Subscription();

  constructor(private readonly eventBus: IEventBus) {
    this.init();
  }

  private init(): void {
    const sub = this.eventBus
      .ofType('StockReserved')
      .pipe(
        // Resiliência do Stream: o catchError no Observable interno garante
        // que um erro lançado durante o processamento do pedido não derrube o stream externo.
        concatMap((event) =>
          this.processPayment(event).pipe(
            catchError((err: unknown) => {
              const reason = err instanceof Error ? err.message : 'GATEWAY_ERROR';
              const failedEvent: PaymentFailedEvent = {
                type: 'PaymentFailed',
                payload: {
                  orderId: event.payload.orderId,
                  reason,
                },
              };
              return of(failedEvent);
            })
          )
        )
      )
      .subscribe({
        next: (resultEvent) => {
          this.eventBus.publish(resultEvent);
        },
        error: (err) => {
          console.error('[PaymentModule] Stream error:', err);
        },
      });

    this.subscription.add(sub);
  }

  private processPayment(
    event: StockReservedEvent
  ): Observable<PaymentApprovedEvent | PaymentFailedEvent> {
    return of(event).pipe(
      map((ev) => {
        const { orderId, totalAmount, simulatePaymentError } = ev.payload;

        // Regra 1: Simulação de queda de gateway (lança erro interno na stream)
        if (simulatePaymentError) {
          throw new Error('GATEWAY_ERROR');
        }

        // Regra 2: Limite de valor excedido
        if (totalAmount > 1000) {
          const failedEvent: PaymentFailedEvent = {
            type: 'PaymentFailed',
            payload: {
              orderId,
              reason: 'LIMIT_EXCEEDED',
            },
          };
          return failedEvent;
        }

        // Regra 3: Pagamento aprovado com sucesso
        const approvedEvent: PaymentApprovedEvent = {
          type: 'PaymentApproved',
          payload: {
            orderId,
            totalAmount,
          },
        };
        return approvedEvent;
      })
    );
  }

  public dispose(): void {
    this.subscription.unsubscribe();
  }
}
