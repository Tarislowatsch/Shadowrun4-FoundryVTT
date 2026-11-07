/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  testRunner: 'vitest',
  vitest: { configFile: 'vitest.config.js' },
  plugins: ['@stryker-mutator/vitest-runner'],
  mutate: ['src/**/*.js', '!src/lang/**'],
  ignorePatterns: ['foundry', 'shadowrun4e', 'packs', 'reports', '.claude'],
  coverageAnalysis: 'perTest',
  incremental: true,
  incrementalFile: 'reports/stryker-incremental.json',
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  tempDirName: '.stryker-tmp',
  cleanTempDir: 'always',
  timeoutMS: 10000,
};
