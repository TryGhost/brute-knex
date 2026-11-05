const dialects = (process.env.BRUTE_KNEX_DIALECTS || 'sqlite')
    .split(',')
    .map((dialect) => dialect.trim())
    .filter(Boolean);

// Dialect-restricted e2e runs skip the sqlite-only suites that exercise the
// default-constructor and callback-rethrow paths, so only runs that include
// sqlite can hold the implementation to full coverage.
const coverageTarget = dialects.includes('sqlite') ? 100 : 80;

module.exports = {
    test: {
        coverage: {
            include: ['build/index.js'],
            provider: 'v8',
            reporter: ['text', 'json-summary', 'lcov'],
            thresholds: {
                branches: coverageTarget,
                functions: coverageTarget,
                lines: coverageTarget,
                statements: coverageTarget,
            },
        },
        globals: true,
    },
};
