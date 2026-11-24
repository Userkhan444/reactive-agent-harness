import { type Observable, Subject, filter } from 'rxjs';

export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly type: TType;
  readonly payload: Readonly<TPayload>;
  readonly timestamp: number;
}

export class EventBus {
  private readonly subject$ = new Subject<DomainEvent>();

  publish<T extends DomainEvent>(event: T): void {
    this.subject$.next(Object.freeze({ ...event }));
  }

  on<T extends DomainEvent>(type: T['type']): Observable<T> {
    return this.subject$.asObservable().pipe(
      filter((event): event is T => event.type === type),
    );
  }

  complete(): void {
    this.subject$.complete();
  }
}
