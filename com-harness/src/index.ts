import { EventBus } from './shared/event-bus.js';
import { OrderModule } from './modules/order/order.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';

export function runDemo(): void {
  console.log('=== Inicializando Pipeline Reativo de Processamento de Pedidos ===\n');

  const eventBus = new EventBus();
  const orderModule = new OrderModule(eventBus);
  const inventoryModule = new InventoryModule(eventBus, {
    notebook: 5,
    mouse: 10,
    teclado: 2,
  });
  const paymentModule = new PaymentModule(eventBus);
  const notificationModule = new NotificationModule(eventBus);

  // Cenário 1: Pedido válido (sucesso completo até PaymentApproved)
  console.log('--- Cenário 1: Pedido válido (sucesso completo até PaymentApproved) ---');
  orderModule.createOrder({
    id: 'ORD-001',
    item: 'notebook',
    quantity: 1,
    totalAmount: 500,
  });

  // Cenário 2: Pedido sem estoque suficiente (OrderFailed: OUT_OF_STOCK)
  console.log('--- Cenário 2: Pedido sem estoque suficiente (OrderFailed) ---');
  orderModule.createOrder({
    id: 'ORD-002',
    item: 'teclado',
    quantity: 5, // Há apenas 2 no estoque
    totalAmount: 300,
  });

  // Cenário 3: Pedido com erro simulado no pagamento (PaymentFailed: GATEWAY_ERROR)
  console.log('--- Cenário 3: Pedido com simulatePaymentError: true (PaymentFailed) ---');
  orderModule.createOrder({
    id: 'ORD-003',
    item: 'mouse',
    quantity: 2,
    totalAmount: 100,
    simulatePaymentError: true,
  });

  // Cenário 4: Novo pedido válido após o erro (provando resiliência do stream)
  console.log('--- Cenário 4: Novo pedido válido após o erro (stream resiliente) ---');
  orderModule.createOrder({
    id: 'ORD-004',
    item: 'mouse',
    quantity: 1,
    totalAmount: 50,
  });

  console.log('\n=== Histórico Final Registrado no NotificationModule ===');
  const history = notificationModule.getHistory();
  console.table(history);

  // Encerramento limpo das assinaturas
  orderModule.dispose();
  inventoryModule.dispose();
  paymentModule.dispose();
  notificationModule.dispose();
  eventBus.complete();

  console.log('\n=== Pipeline finalizado e assinaturas encerradas com sucesso. ===');
}

runDemo();
