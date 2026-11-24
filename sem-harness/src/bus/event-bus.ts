import { Subject, Observable, filter } from 'rxjs';
import type { AppEvent, EventType, Disposable } from '../types/index.js';

export interface IEventBus extends Disposable {
  publish(event: AppEvent): void;
  ofType<T extends EventType>(type: T): Observable<Extract<AppEvent, { type: T }>>;
  get events$(): Observable<AppEvent>;
}

export class EventBus implements IEventBus {
  private readonly subject$ = new Subject<AppEvent>();

  public publish(event: AppEvent): void {
    if (this.subject$.closed || this.subject$.isStopped) {
      throw new Error('EventBus is disposed and cannot publish events.');
    }
    this.subject$.next(event);
  }

  public ofType<T extends EventType>(type: T): Observable<Extract<AppEvent, { type: T }>> {
    return this.subject$.asObservable().pipe(
      filter((event): event is Extract<AppEvent, { type: T }> => event.type === type)
    );
  }

  public get events$(): Observable<AppEvent> {
    return this.subject$.asObservable();
  }

  public dispose(): void {
    if (!this.subject$.closed) {
      this.subject$.complete();
      this.subject$.unsubscribe();
    }
  }
}
