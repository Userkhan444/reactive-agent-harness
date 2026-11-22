# Diretrizes de Arquitetura e Validacao (Harness)

Este projeto implementa um pipeline reativo de processamento de pedidos em memoria usando TypeScript e RxJS.

## 1. Estrutura Obrigatoria de Pastas
- `src/shared/`: Contem o `EventBus` central e os tipos de eventos (`OrderCreated`, `StockReserved`, `OrderFailed`, `PaymentApproved`, `PaymentFailed`).
- `src/modules/order/`: Implementa `OrderModule`.
- `src/modules/inventory/`: Implementa `InventoryModule`.
- `src/modules/payment/`: Implementa `PaymentModule`.
- `src/modules/notification/`: Implementa `NotificationModule`.
- `src/index.ts`: Ponto de entrada que inicializa o `EventBus` e os 4 modulos, executa os 4 cenarios do `SPEC.md`, exibe o historico final e encerra as assinaturas.
- `tests/`: Testes automatizados com Vitest cobrindo os 4 cenarios e a resiliencia do stream.

## 2. Regras Arquiteturais Inegociaveis
1. **Desacoplamento Estrito:** Nenhum arquivo dentro de `src/modules/<modulo>` pode importar arquivos de outro diretorio em `src/modules/*`. Toda comunicacao ocorre exclusivamente via `EventBus`.
2. **Resiliencia de Stream (RxJS):**
   - Nunca lance excecoes nao tratadas dentro de `.subscribe()` ou diretamente no stream principal do `Subject`.
   - Ao simular erros (como `simulatePaymentError: true`), capture o erro internamente com `catchError` dentro de operadores de achatamento (`mergeMap` ou `concatMap`) para emitir `PaymentFailed` (`"GATEWAY_ERROR"`) sem encerrar a assinatura principal.
3. **Ciclo de Vida:** Todos os modulos devem armazenar suas `Subscription`s (ou usar `Subject` + `takeUntil`) e expor um metodo `dispose()` para encerra-las.
4. **Tipagem Estrita:** Proibido usar `any`. Use `import type` para importacoes exclusivas de tipos.

## 3. Protocolo de Conclusao (Autocorrecao)
Antes de encerrar qualquer tarefa, voce **DEVE** executar no terminal:
`npm run validate`

Se qualquer etapa (`typecheck`, `lint`, `arch:check` ou `test`) falhar, corrija o problema e execute `npm run validate` novamente ate obter saida limpa (codigo 0).
