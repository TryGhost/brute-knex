'use strict';

const assert = require('node:assert/strict');
const KnexStore = require('@tryghost/brute-knex');

/** Exercise a clean installation through the public store API and real SQLite. */
async function main() {
    const store = new KnexStore();

    try {
        const firstRequest = new Date('2026-01-01T00:00:00.000Z');
        const lastRequest = new Date('2026-01-01T00:01:00.000Z');
        await store.set('consumer', { count: 2, firstRequest, lastRequest }, 60);
        assert.deepEqual(await store.get('consumer'), { count: 2, firstRequest, lastRequest });

        await store.reset('consumer');
        assert.equal(await store.get('consumer'), null);
    } finally {
        await store.knex.destroy();
    }
}

main().catch((error) => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
});
