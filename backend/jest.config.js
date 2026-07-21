// backend/jest.config.js

module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
  maxWorkers: 1,
  testTimeout: 30000,
};
