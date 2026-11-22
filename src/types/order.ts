export interface OrderInput {
  id: string;
  item: string;
  quantity: number;
  totalAmount: number;
  simulatePaymentError?: boolean;
}

export type NotificationStatus = 'APPROVED' | 'FAILED';

export interface NotificationRecord {
  orderId: string;
  status: NotificationStatus;
  eventType: 'PaymentApproved' | 'PaymentFailed' | 'OrderFailed';
  reason?: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface Disposable {
  dispose(): void;
}
