export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.js', // Exclude JS files from coverage
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  modulePathIgnorePatterns: ['<rootDir>/src/.*\\.js$'], // Ignore JS files in src
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!cbor2)/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
};