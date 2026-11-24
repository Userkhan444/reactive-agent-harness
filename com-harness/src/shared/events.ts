import type { DomainEvent } from './event-bus.js';

export interface OrderCreatedPayload {
  readonly id: string;
  readonly orderId: string;
  readonly item: string;
  readonly quantity: number;
  readonly totalAmount: number;
  readonly simulatePaymentError?: boolean | undefined;
}

export interface StockReservedPayload {
  readonly id: string;
  readonly orderId: string;
  readonly item: string;
  readonly quantity: number;
  readonly totalAmount: number;
  readonly simulatePaymentError?: boolean | undefined;
}

export type OrderFailedReason = 'OUT_OF_STOCK' | (string & {});

export interface OrderFailedPayload {
  readonly id: string;
  readonly orderId: string;
  readonly reason: OrderFailedReason;
}

export type PaymentFailedReason = 'GATEWAY_ERROR' | 'LIMIT_EXCEEDED' | (string & {});

export interface PaymentFailedPayload {
  readonly id: string;
  readonly orderId: string;
  readonly reason: PaymentFailedReason;
}

export interface PaymentApprovedPayload {
  readonly id: string;
  readonly orderId: string;
  readonly totalAmount: number;
}

export type OrderCreatedEvent = DomainEvent<'OrderCreated', OrderCreatedPayload>;
export type StockReservedEvent = DomainEvent<'StockReserved', StockReservedPayload>;
export type OrderFailedEvent = DomainEvent<'OrderFailed', OrderFailedPayload>;
export type PaymentApprovedEvent = DomainEvent<'PaymentApproved', PaymentApprovedPayload>;
export type PaymentFailedEvent = DomainEvent<'PaymentFailed', PaymentFailedPayload>;

export type AppDomainEvent =
  | OrderCreatedEvent
  | StockReservedEvent
  | OrderFailedEvent
  | PaymentApprovedEvent
  | PaymentFailedEvent;
