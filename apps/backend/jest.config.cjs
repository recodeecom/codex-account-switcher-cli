const testType = process.env.TEST_TYPE

const matchByType = {
  'integration:http': ['<rootDir>/integration-tests/http/**/*.spec.ts'],
  'integration:modules': ['<rootDir>/integration-tests/modules/**/*.spec.ts'],
  unit: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
}

module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2022',
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: matchByType[testType] ?? ['<rootDir>/**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.medusa/'],
}
