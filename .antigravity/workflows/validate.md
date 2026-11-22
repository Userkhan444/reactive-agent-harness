---
description: Executa a bateria completa de validacao arquitetural, lint, tipagem e testes reativos
---

1. Execute `npm run validate` no terminal do workspace.
2. Se `arch:check` falhar (`no-cross-module-imports`), remova importacoes diretas entre modulos e substitua por eventos no `EventBus`.
3. Se `typecheck` ou `lint` falhar, elimine qualquer `any`, ajuste tipos (`import type`) e corrija variaveis nao usadas.
4. Se `test` falhar, corrija o pipeline RxJS garantindo que `catchError` proteja o stream principal contra erros em pedidos individuais.
5. Repita `npm run validate` ate passar sem erros.
