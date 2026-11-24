import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/bus/event-bus.js';
import {
  OrderModule,
  InventoryModule,
  PaymentModule,
  NotificationModule,
} from '../src/modules/index.js';

describe('Pipeline Reativo de Processamento de Pedidos', () => {
  it('deve processar com sucesso um pedido válido até PaymentApproved', () => {
    const eventBus = new EventBus();
    const inventory = new InventoryModule(eventBus, { notebook: 5 });
    const payment = new PaymentModule(eventBus);
    const notification = new NotificationModule(eventBus);
    const order = new OrderModule(eventBus);

    order.createOrder({
      id: 'ord-101',
      item: 'notebook',
      quantity: 2,
      totalAmount: 500,
    });

    const history = notification.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0]?.orderId, 'ord-101');
    assert.equal(history[0]?.status, 'APPROVED');
    assert.equal(history[0]?.eventType, 'PaymentApproved');
    assert.equal(inventory.getStock('notebook'), 3);

    order.dispose();
    inventory.dispose();
    payment.dispose();
    notification.dispose();
    eventBus.dispose();
  });

  it('deve falhar com OUT_OF_STOCK quando o estoque for insuficiente', () => {
    const eventBus = new EventBus();
    const inventory = new InventoryModule(eventBus, { teclado: 2 });
    const payment = new PaymentModule(eventBus);
    const notification = new NotificationModule(eventBus);
    const order = new OrderModule(eventBus);

    order.createOrder({
      id: 'ord-102',
      item: 'teclado',
      quantity: 5,
      totalAmount: 200,
    });

    const history = notification.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0]?.orderId, 'ord-102');
    assert.equal(history[0]?.status, 'FAILED');
    assert.equal(history[0]?.eventType, 'OrderFailed');
    assert.equal(history[0]?.reason, 'OUT_OF_STOCK');
    assert.equal(inventory.getStock('teclado'), 2); // Estoque não alterado

    order.dispose();
    inventory.dispose();
    payment.dispose();
    notification.dispose();
    eventBus.dispose();
  });

  it('deve falhar com GATEWAY_ERROR quando simulatePaymentError for true e manter o stream ativo para pedidos seguintes (Resiliência)', () => {
    const eventBus = new EventBus();
    const inventory = new InventoryModule(eventBus, { mouse: 10, notebook: 2 });
    const payment = new PaymentModule(eventBus);
    const notification = new NotificationModule(eventBus);
    const order = new OrderModule(eventBus);

    // Pedido 1: Erro simulado no pagamento
    order.createOrder({
      id: 'ord-err',
      item: 'mouse',
      quantity: 1,
      totalAmount: 100,
      simulatePaymentError: true,
    });

    // Pedido 2: Novo pedido normal logo após o erro
    order.createOrder({
      id: 'ord-after-err',
      item: 'notebook',
      quantity: 1,
      totalAmount: 800,
    });

    const history = notification.getHistory();
    assert.equal(history.length, 2);

    // Primeiro pedido falhou por GATEWAY_ERROR
    assert.equal(history[0]?.orderId, 'ord-err');
    assert.equal(history[0]?.status, 'FAILED');
    assert.equal(history[0]?.eventType, 'PaymentFailed');
    assert.equal(history[0]?.reason, 'GATEWAY_ERROR');

    // Segundo pedido teve sucesso, provando que a stream não encerrou
    assert.equal(history[1]?.orderId, 'ord-after-err');
    assert.equal(history[1]?.status, 'APPROVED');
    assert.equal(history[1]?.eventType, 'PaymentApproved');

    order.dispose();
    inventory.dispose();
    payment.dispose();
    notification.dispose();
    eventBus.dispose();
  });

  it('deve recusar pagamento com LIMIT_EXCEEDED se totalAmount > 1000', () => {
    const eventBus = new EventBus();
    const inventory = new InventoryModule(eventBus, { celular: 5 });
    const payment = new PaymentModule(eventBus);
    const notification = new NotificationModule(eventBus);
    const order = new OrderModule(eventBus);

    order.createOrder({
      id: 'ord-limit',
      item: 'celular',
      quantity: 1,
      totalAmount: 1500, // > 1000
    });

    const history = notification.getHistory();
    assert.equal(history.length, 1);
    assert.equal(history[0]?.orderId, 'ord-limit');
    assert.equal(history[0]?.status, 'FAILED');
    assert.equal(history[0]?.eventType, 'PaymentFailed');
    assert.equal(history[0]?.reason, 'LIMIT_EXCEEDED');

    order.dispose();
    inventory.dispose();
    payment.dispose();
    notification.dispose();
    eventBus.dispose();
  });

  it('deve executar o ciclo de vida dispose() corretamente e ignorar eventos após dispose', () => {
    const eventBus = new EventBus();
    const inventory = new InventoryModule(eventBus, { notebook: 5 });
    const payment = new PaymentModule(eventBus);
    const notification = new NotificationModule(eventBus);
    const order = new OrderModule(eventBus);

    // Encerra assinaturas
    order.dispose();
    inventory.dispose();
    payment.dispose();
    notification.dispose();

    // EventBus ainda aceita ou podemos verificar que os módulos não reagem mais
    eventBus.publish({
      type: 'OrderCreated',
      payload: {
        orderId: 'ord-ignored',
        item: 'notebook',
        quantity: 1,
        totalAmount: 100,
      },
    });

    // O NotificationModule não deve ter registrado nada porque foi cancelado
    assert.equal(notification.getHistory().length, 0);

    // Estoque não deve ter mudado
    assert.equal(inventory.getStock('notebook'), 5);

    eventBus.dispose();

    // EventBus após dispose lança erro se tentar publicar
    assert.throws(() => {
      eventBus.publish({
        type: 'OrderCreated',
        payload: {
          orderId: 'ord-after-bus-disposed',
          item: 'notebook',
          quantity: 1,
          totalAmount: 100,
        },
      });
    });
  });
});
