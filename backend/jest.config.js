/** @type {import('jest').Config} */
const base = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  testEnvironment: 'node',
};

module.exports = {
  projects: [
    { ...base, displayName: 'unit', rootDir: '.', roots: ['<rootDir>/src'], testRegex: '.*\\.spec\\.ts$' },
    {
      ...base,
      displayName: 'e2e',
      rootDir: '.',
      roots: ['<rootDir>/test'],
      testRegex: '.*\\.e2e-spec\\.ts$',
    },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/database/**',
  ],
  coverageDirectory: 'coverage',
  // DoD: độ phủ nhánh >= 60%
  coverageThreshold: { global: { branches: 60, functions: 60, lines: 60, statements: 60 } },
};
