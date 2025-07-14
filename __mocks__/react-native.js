module.exports = {
  NativeModules: new Proxy(
    {},
    {
      get: (target, name) => {
        if (name === 'PlatformConstants') {
          return {
            getConstants: () => ({ isTesting: true }),
          };
        }
        // Return a mock function for any other NativeModule
        return new Proxy(
          {},
          {
            get: (target, methodName) => {
              return jest.fn(() => {
                console.warn(`Native module ${String(name)}.${String(methodName)} called.`);
                return Promise.resolve(); // Or return a default value if needed
              });
            },
          },
        );
      },
    },
  ),
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  // Add other top-level React Native exports that might be used
  // e.g., Dimensions, AsyncStorage, etc.
  Dimensions: {
    get: jest.fn(() => ({ width: 100, height: 200 })),
  },
  AsyncStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve(null)),
    removeItem: jest.fn(() => Promise.resolve(null)),
    clear: jest.fn(() => Promise.resolve(null)),
    getAllKeys: jest.fn(() => Promise.resolve(null)),
    multiGet: jest.fn(() => Promise.resolve(null)),
    multiSet: jest.fn(() => Promise.resolve(null)),
    multiRemove: jest.fn(() => Promise.resolve(null)),
  },
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
  })),
};
