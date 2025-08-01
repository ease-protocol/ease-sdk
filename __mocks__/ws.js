const mockWebSocket = {
  on: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
};

module.exports = jest.fn().mockImplementation(() => mockWebSocket);
