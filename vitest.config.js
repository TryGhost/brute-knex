module.exports = {
  test: {
    coverage: {
      include: ['index.js'],
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    globals: true
  }
};
