export interface OrderCreatedPayload {
  orderId: string;
  item: string;
  quantity: number;
  totalAmount: number;
  simulatePaymentError?: boolean;
}

export interface StockReservedPayload {
  orderId: string;
  item: string;
  quantity: number;
  totalAmount: number;
  simulatePaymentError?: boolean;
}

export interface OrderFailedPayload {
  orderId: string;
  reason: 'OUT_OF_STOCK' | string;
  item?: string;
  quantity?: number;
}

export interface PaymentApprovedPayload {
  orderId: string;
  totalAmount: number;
}

export interface PaymentFailedPayload {
  orderId: string;
  reason: 'GATEWAY_ERROR' | 'LIMIT_EXCEEDED' | string;
}

export interface OrderCreatedEvent {
  type: 'OrderCreated';
  payload: OrderCreatedPayload;
}

export interface StockReservedEvent {
  type: 'StockReserved';
  payload: StockReservedPayload;
}

export interface OrderFailedEvent {
  type: 'OrderFailed';
  payload: OrderFailedPayload;
}

export interface PaymentApprovedEvent {
  type: 'PaymentApproved';
  payload: PaymentApprovedPayload;
}

export interface PaymentFailedEvent {
  type: 'PaymentFailed';
  payload: PaymentFailedPayload;
}

export type AppEvent =
  | OrderCreatedEvent
  | StockReservedEvent
  | OrderFailedEvent
  | PaymentApprovedEvent
  | PaymentFailedEvent;

export type EventType = AppEvent['type'];
