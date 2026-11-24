import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/shared/event-bus.js';
import { OrderModule } from '../src/modules/order/order.module.js';
import { InventoryModule } from '../src/modules/inventory/inventory.module.js';
import { PaymentModule } from '../src/modules/payment/payment.module.js';
import { NotificationModule } from '../src/modules/notification/notification.module.js';
import type {
  OrderCreatedEvent,
  StockReservedEvent,
  OrderFailedEvent,
  PaymentApprovedEvent,
  PaymentFailedEvent,
} from '../src/shared/events.js';

describe('Pipeline Reativo de Processamento de Pedidos', () => {
  it('Cenário 1: executa pedido válido com sucesso até PaymentApproved', () => {
    const eventBus = new EventBus();
    const orderModule = new OrderModule(eventBus);
    const inventoryModule = new InventoryModule(eventBus, { notebook: 5 });
    const paymentModule = new PaymentModule(eventBus);
    const notificationModule = new NotificationModule(eventBus);

    orderModule.createOrder({
      id: 'ord-101',
      item: 'notebook',
      quantity: 2,
      totalAmount: 800,
    });

    const history = notificationModule.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      orderId: 'ord-101',
      status: 'APPROVED',
      eventType: 'PaymentApproved',
    });
    expect(inventoryModule.getStock('notebook')).toBe(3);

    orderModule.dispose();
    inventoryModule.dispose();
    paymentModule.dispose();
    notificationModule.dispose();
    eventBus.complete();
  });

  it('Cenário 2: falha com OrderFailed quando não há estoque suficiente', () => {
    const eventBus = new EventBus();
    const orderModule = new OrderModule(eventBus);
    const inventoryModule = new InventoryModule(eventBus, { teclado: 2 });
    const paymentModule = new PaymentModule(eventBus);
    const notificationModule = new NotificationModule(eventBus);

    orderModule.createOrder({
      id: 'ord-102',
      item: 'teclado',
      quantity: 5,
      totalAmount: 500,
    });

    const history = notificationModule.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      orderId: 'ord-102',
      status: 'ORDER_FAILED',
      eventType: 'OrderFailed',
      reason: 'OUT_OF_STOCK',
    });
    // Estoque permanece inalterado
    expect(inventoryModule.getStock('teclado')).toBe(2);

    orderModule.dispose();
    inventoryModule.dispose();
    paymentModule.dispose();
    notificationModule.dispose();
    eventBus.complete();
  });

  it('Cenário 3 e 4: lida com erro simulado no pagamento e mantém o stream vivo para o pedido seguinte', () => {
    const eventBus = new EventBus();
    const orderModule = new OrderModule(eventBus);
    const inventoryModule = new InventoryModule(eventBus, { mouse: 10 });
    const paymentModule = new PaymentModule(eventBus);
    const notificationModule = new NotificationModule(eventBus);

    // Cenário 3: erro simulado no pagamento
    orderModule.createOrder({
      id: 'ord-103',
      item: 'mouse',
      quantity: 2,
      totalAmount: 200,
      simulatePaymentError: true,
    });

    expect(notificationModule.getHistory()).toHaveLength(1);
    expect(notificationModule.getRecord('ord-103')).toMatchObject({
      orderId: 'ord-103',
      status: 'PAYMENT_FAILED',
      eventType: 'PaymentFailed',
      reason: 'GATEWAY_ERROR',
    });

    // Cenário 4: novo pedido válido após o erro
    orderModule.createOrder({
      id: 'ord-104',
      item: 'mouse',
      quantity: 1,
      totalAmount: 100,
    });

    expect(notificationModule.getHistory()).toHaveLength(2);
    expect(notificationModule.getRecord('ord-104')).toMatchObject({
      orderId: 'ord-104',
      status: 'APPROVED',
      eventType: 'PaymentApproved',
    });

    orderModule.dispose();
    inventoryModule.dispose();
    paymentModule.dispose();
    notificationModule.dispose();
    eventBus.complete();
  });

  it('recusa pagamento quando totalAmount > 1000 com LIMIT_EXCEEDED', () => {
    const eventBus = new EventBus();
    const orderModule = new OrderModule(eventBus);
    const inventoryModule = new InventoryModule(eventBus, { notebook: 5 });
    const paymentModule = new PaymentModule(eventBus);
    const notificationModule = new NotificationModule(eventBus);

    orderModule.createOrder({
      id: 'ord-105',
      item: 'notebook',
      quantity: 1,
      totalAmount: 1500,
    });

    const record = notificationModule.getRecord('ord-105');
    expect(record).toBeDefined();
    expect(record).toMatchObject({
      orderId: 'ord-105',
      status: 'PAYMENT_FAILED',
      eventType: 'PaymentFailed',
      reason: 'LIMIT_EXCEEDED',
    });

    orderModule.dispose();
    inventoryModule.dispose();
    paymentModule.dispose();
    notificationModule.dispose();
    eventBus.complete();
  });

  it('executa os 4 cenários em sequência exatamente como descrito no SPEC.md', () => {
    const eventBus = new EventBus();
    const orderModule = new OrderModule(eventBus);
    const inventoryModule = new InventoryModule(eventBus, {
      notebook: 5,
      mouse: 10,
      teclado: 2,
    });
    const paymentModule = new PaymentModule(eventBus);
    const notificationModule = new NotificationModule(eventBus);

    // 1. Pedido válido (sucesso completo até PaymentApproved)
    orderModule.createOrder({
      id: 'ORD-001',
      item: 'notebook',
      quantity: 1,
      totalAmount: 500,
    });

    // 2. Pedido sem estoque suficiente (OrderFailed)
    orderModule.createOrder({
      id: 'ORD-002',
      item: 'teclado',
      quantity: 5,
      totalAmount: 300,
    });

    // 3. Pedido com simulatePaymentError: true (força erro no stream e resulta em PaymentFailed)
    orderModule.createOrder({
      id: 'ORD-003',
      item: 'mouse',
      quantity: 2,
      totalAmount: 100,
      simulatePaymentError: true,
    });

    // 4. Novo pedido válido após o erro (provando que o stream continuou vivo)
    orderModule.createOrder({
      id: 'ORD-004',
      item: 'mouse',
      quantity: 1,
      totalAmount: 50,
    });

    const history = notificationModule.getHistory();
    expect(history).toHaveLength(4);

    expect(history[0]?.orderId).toBe('ORD-001');
    expect(history[0]?.status).toBe('APPROVED');
    expect(history[0]?.eventType).toBe('PaymentApproved');

    expect(history[1]?.orderId).toBe('ORD-002');
    expect(history[1]?.status).toBe('ORDER_FAILED');
    expect(history[1]?.reason).toBe('OUT_OF_STOCK');

    expect(history[2]?.orderId).toBe('ORD-003');
    expect(history[2]?.status).toBe('PAYMENT_FAILED');
    expect(history[2]?.reason).toBe('GATEWAY_ERROR');

    expect(history[3]?.orderId).toBe('ORD-004');
    expect(history[3]?.status).toBe('APPROVED');
    expect(history[3]?.eventType).toBe('PaymentApproved');

    // Validação de estado final do estoque
    expect(inventoryModule.getStock('notebook')).toBe(4);
    expect(inventoryModule.getStock('teclado')).toBe(2);
    expect(inventoryModule.getStock('mouse')).toBe(7); // 10 - 2 (ord-003) - 1 (ord-004)

    orderModule.dispose();
    inventoryModule.dispose();
    paymentModule.dispose();
    notificationModule.dispose();
    eventBus.complete();
  });

  it('respeita o ciclo de vida e encerra assinaturas com dispose()', () => {
    const eventBus = new EventBus();
    const orderModule = new OrderModule(eventBus);
    const inventoryModule = new InventoryModule(eventBus, { mouse: 5 });
    const paymentModule = new PaymentModule(eventBus);
    const notificationModule = new NotificationModule(eventBus);

    // Dispose de todos os módulos
    orderModule.dispose();
    inventoryModule.dispose();
    paymentModule.dispose();
    notificationModule.dispose();

    // Novo pedido não deve alterar o estoque nem ser registrado na notificação
    orderModule.createOrder({
      id: 'ord-disposed',
      item: 'mouse',
      quantity: 1,
      totalAmount: 50,
    });

    expect(inventoryModule.getStock('mouse')).toBe(5);
    expect(notificationModule.getHistory()).toHaveLength(0);

    eventBus.complete();
  });

  it('garante que todos os eventos publicados passam pelo EventBus', () => {
    const eventBus = new EventBus();
    const publishedEvents: string[] = [];

    const busSub = eventBus.on<OrderCreatedEvent>('OrderCreated').subscribe(() => {
      publishedEvents.push('OrderCreated');
    });
    const busSub2 = eventBus.on<StockReservedEvent>('StockReserved').subscribe(() => {
      publishedEvents.push('StockReserved');
    });
    const busSub3 = eventBus.on<PaymentApprovedEvent>('PaymentApproved').subscribe(() => {
      publishedEvents.push('PaymentApproved');
    });
    const busSub4 = eventBus.on<PaymentFailedEvent>('PaymentFailed').subscribe(() => {
      publishedEvents.push('PaymentFailed');
    });
    const busSub5 = eventBus.on<OrderFailedEvent>('OrderFailed').subscribe(() => {
      publishedEvents.push('OrderFailed');
    });

    const orderModule = new OrderModule(eventBus);
    const inventoryModule = new InventoryModule(eventBus, { mouse: 5 });
    const paymentModule = new PaymentModule(eventBus);
    const notificationModule = new NotificationModule(eventBus);

    orderModule.createOrder({
      id: 'ord-all',
      item: 'mouse',
      quantity: 1,
      totalAmount: 50,
    });

    expect(publishedEvents).toEqual(['OrderCreated', 'StockReserved', 'PaymentApproved']);

    busSub.unsubscribe();
    busSub2.unsubscribe();
    busSub3.unsubscribe();
    busSub4.unsubscribe();
    busSub5.unsubscribe();

    orderModule.dispose();
    inventoryModule.dispose();
    paymentModule.dispose();
    notificationModule.dispose();
    eventBus.complete();
  });
});
