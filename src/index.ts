import { EventBus } from './bus/event-bus.js';
import {
  OrderModule,
  InventoryModule,
  PaymentModule,
  NotificationModule,
} from './modules/index.js';
import type { NotificationRecord } from './types/index.js';

/**
 * Executa a demonstração do pipeline reativo cobrindo os 4 cenários da especificação.
 */
export function runDemo(): ReadonlyArray<NotificationRecord> {
  console.log('='.repeat(60));
  console.log('  PIPELINE REATIVO DE PROCESSAMENTO DE PEDIDOS (RxJS)');
  console.log('='.repeat(60));

  // 1. Inicializa o EventBus central
  const eventBus = new EventBus();

  // Opcional: Logger reativo de eventos emitidos no EventBus para transparência
  const logSub = eventBus.events$.subscribe((event) => {
    console.log(`[EventBus] -> [${event.type}]`, JSON.stringify(event.payload));
  });

  // 2. Inicializa os 4 módulos desacoplados (apenas recebem o EventBus)
  const inventoryModule = new InventoryModule(eventBus, {
    notebook: 5,
    mouse: 10,
    teclado: 2,
  });
  const paymentModule = new PaymentModule(eventBus);
  const notificationModule = new NotificationModule(eventBus);
  const orderModule = new OrderModule(eventBus);

  console.log('\n[Estoque Inicial]:', inventoryModule.getAllStock());

  // Cenário 1: Pedido válido (sucesso completo até PaymentApproved)
  console.log('\n--- Cenário 1: Pedido Válido (Sucesso Completo) ---');
  orderModule.createOrder({
    id: 'order-1',
    item: 'notebook',
    quantity: 1,
    totalAmount: 500,
  });

  // Cenário 2: Pedido sem estoque suficiente (OrderFailed)
  console.log('\n--- Cenário 2: Pedido Sem Estoque Suficiente (OrderFailed: OUT_OF_STOCK) ---');
  orderModule.createOrder({
    id: 'order-2',
    item: 'teclado',
    quantity: 5, // Há apenas 2 teclados em estoque
    totalAmount: 300,
  });

  // Cenário 3: Pedido com simulatePaymentError: true (força erro no stream e resulta em PaymentFailed)
  console.log('\n--- Cenário 3: Simulação de Erro no Pagamento (PaymentFailed: GATEWAY_ERROR) ---');
  orderModule.createOrder({
    id: 'order-3',
    item: 'mouse',
    quantity: 2,
    totalAmount: 200,
    simulatePaymentError: true, // Força exceção interna de gateway
  });

  // Cenário 4: Novo pedido válido após o erro (provando que o stream continuou vivo)
  console.log('\n--- Cenário 4: Novo Pedido Válido Após o Erro (Stream Continua Ativo) ---');
  orderModule.createOrder({
    id: 'order-4',
    item: 'notebook',
    quantity: 1,
    totalAmount: 500,
  });

  // Exibe o histórico final registrado pelo NotificationModule
  console.log('\n' + '='.repeat(60));
  console.log('  HISTÓRICO FINAL DE NOTIFICAÇÕES (NotificationModule)');
  console.log('='.repeat(60));

  const history = notificationModule.getHistory();
  console.table(
    history.map((record) => ({
      'Order ID': record.orderId,
      'Status': record.status,
      'Evento Final': record.eventType,
      'Motivo': record.reason ?? 'N/A',
      'Data/Hora': record.timestamp.toLocaleTimeString(),
    }))
  );

  console.log('\n[Estoque Final]:', inventoryModule.getAllStock());

  // Limpeza de assinaturas para evitar vazamento de memória
  console.log('\n[Lifecycle] Encerrando assinaturas (dispose)...');
  logSub.unsubscribe();
  orderModule.dispose();
  inventoryModule.dispose();
  paymentModule.dispose();
  notificationModule.dispose();
  eventBus.dispose();
  console.log('[Lifecycle] Todos os módulos e o EventBus foram encerrados com sucesso.');

  return history;
}

// Execução direta
runDemo();
