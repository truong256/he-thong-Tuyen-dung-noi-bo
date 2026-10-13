/** Unit test tầng service + kiểm ngưỡng độ phủ nhánh >= 60% (DoD) */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/headcount-budget/headcount-budget.service.ts',
    'src/requisitions/requisitions.service.ts',
  ],
  coverageThreshold: {
    global: { branches: 60, functions: 60, lines: 60, statements: 60 },
  },
};
