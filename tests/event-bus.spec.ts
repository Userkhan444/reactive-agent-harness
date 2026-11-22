import { describe, expect, it } from 'vitest';
import { type DomainEvent, EventBus } from '../src/shared/event-bus.js';

type SampleEvent = DomainEvent<'SampleEvent', { orderId: string }>;

describe('EventBus', () => {
  it('publica e filtra eventos tipados corretamente', () => {
    const bus = new EventBus();
    const received: SampleEvent[] = [];

    const sub = bus.on<SampleEvent>('SampleEvent').subscribe((event) => {
      received.push(event);
    });

    bus.publish<SampleEvent>({
      type: 'SampleEvent',
      payload: { orderId: 'ord-1' },
      timestamp: Date.now(),
    });

    expect(received).toHaveLength(1);
    expect(received[0]?.payload.orderId).toBe('ord-1');
    sub.unsubscribe();
    bus.complete();
  });
});
