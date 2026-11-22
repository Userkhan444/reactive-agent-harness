/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-imports',
      severity: 'error',
      comment: 'VIOLACAO ARQUITETURAL: Modulos em src/modules/* sao isolados. Comunique-se apenas via EventBus.',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: '^src/modules/$1/'
      }
    },
    {
      name: 'shared-cannot-depend-on-modules',
      severity: 'error',
      comment: 'VIOLACAO ARQUITETURAL: src/shared nao pode importar nada de src/modules.',
      from: { path: '^src/shared/' },
      to: { path: '^src/modules/' }
    },
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      comment: 'VIOLACAO ARQUITETURAL: Dependencia circular detectada.',
      from: {},
      to: { circular: true }
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' }
  }
};
