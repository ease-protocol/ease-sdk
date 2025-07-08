global.__DEV__ = true;

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));
