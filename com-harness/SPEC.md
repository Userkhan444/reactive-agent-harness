# SPEC — Pipeline Reativo de Processamento de Pedidos

## 1. Objetivo
Implementar um pipeline de processamento de pedidos **100% em memória** utilizando **TypeScript** e **ReactiveX (RxJS)**, seguindo uma arquitetura orientada a eventos com módulos desacoplados.

---

## 2. Módulos e Fluxo de Eventos

O sistema deve ser composto por um **EventBus** central (baseado em RxJS) e **4 módulos independentes**:

1. **OrderModule**
   - Expõe um método para criar um pedido (`id`, `item`, `quantity`, `totalAmount`, e flag opcional `simulatePaymentError?: boolean`).
   - Publica o evento `OrderCreated` no `EventBus`.

2. **InventoryModule**
   - Mantém um estoque inicial em memória (ex.: `{ notebook: 5, mouse: 10, teclado: 2 }`).
   - Escuta `OrderCreated`.
   - Se houver estoque suficiente: debita a quantidade e publica `StockReserved`.
   - Se não houver estoque suficiente: publica `OrderFailed` com o motivo (`"OUT_OF_STOCK"`).

3. **PaymentModule**
   - Escuta `StockReserved`.
   - Simula o processamento do pagamento com as seguintes regras:
     - Se `simulatePaymentError` for `true`: lança um erro interno durante o processamento (simulando queda de gateway) e publica `PaymentFailed` (`"GATEWAY_ERROR"`).
     - Se `totalAmount > 1000`: recusa o pagamento e publica `PaymentFailed` (`"LIMIT_EXCEEDED"`).
     - Caso contrário: aprova e publica `PaymentApproved`.

4. **NotificationModule**
   - Escuta `PaymentApproved`, `PaymentFailed` e `OrderFailed`.
   - Registra o status final de cada pedido em um histórico em memória consultável (ex.: `getHistory()`).

---

## 3. Requisitos Técnicos Obrigatórios

- **Desacoplamento estrito:** Os módulos de negócio (`Order`, `Inventory`, `Payment`, `Notification`) **não podem** importar uns aos outros nem chamar métodos diretamente entre si. Toda comunicação ocorre exclusivamente via `EventBus`.
- **Programação Reativa (RxJS):** Usar `Observable` e operadores do RxJS para filtrar, transformar e compor os fluxos de eventos.
- **Resiliência do Stream:** Um erro lançado durante o processamento de um pedido (como no caso de `simulatePaymentError: true`) **não pode derrubar o stream**. Pedidos enviados depois de um erro devem continuar sendo processados normalmente.
- **Gerenciamento de Ciclo de Vida:** Todos os módulos devem permitir o encerramento limpo de suas assinaturas (`dispose()` / `unsubscribe`) para evitar *memory leaks*.
- **Script de Demonstração (`src/index.ts`):** Deve inicializar os módulos e executar 4 pedidos em sequência:
  1. Pedido válido (sucesso completo até `PaymentApproved`).
  2. Pedido sem estoque suficiente (`OrderFailed`).
  3. Pedido com `simulatePaymentError: true` (força erro no stream e resulta em `PaymentFailed`).
  4. Novo pedido válido **após o erro** (provando que o stream continuou vivo).
  - Ao final, exibir no console o histórico registrado pelo `NotificationModule` e encerrar as assinaturas.

---

## 4. Prompt Único (Usar exatamente este texto nos dois experimentos)

> Implemente o pipeline reativo de processamento de pedidos em memória descrito no arquivo `SPEC.md` usando TypeScript e RxJS.
>
> Requisitos essenciais:
> 1. Crie um `EventBus` central com RxJS e 4 módulos desacoplados (`OrderModule`, `InventoryModule`, `PaymentModule` e `NotificationModule`).
> 2. Os módulos não podem importar uns aos outros diretamente; toda comunicação deve acontecer apenas via eventos reativos no `EventBus`.
> 3. Garanta resiliência de stream: um erro durante o processamento de um pedido (`simulatePaymentError: true`) não pode encerrar o `Subject`/stream para os pedidos seguintes.
> 4. Implemente limpeza de assinaturas (`dispose`) para evitar vazamento de memória.
> 5. Crie um arquivo `src/index.ts` que execute os 4 cenários descritos no `SPEC.md` (sucesso, falta de estoque, erro simulado no pagamento e novo sucesso após o erro) e imprima o histórico final do `NotificationModule`.