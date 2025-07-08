module.exports = {
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
  transformIgnorePatterns: ['/node_modules/(?!(cbor2|@sentry/react-native|react-native)/)'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
  },
};
