import type { Knex } from 'knex';
import KnexStore = require('../../index');

declare const knex: Knex;

const store = new KnexStore({
    createTable: false,
    knex,
    tablename: 'brute',
});

store.ready.then(() => undefined);

store.set(
    'client',
    {
        count: 1,
        firstRequest: new Date(),
        lastRequest: Date.now(),
    },
    60,
);

store.set(
    'client',
    {
        count: 2,
        firstRequest: new Date().toISOString(),
        lastRequest: new Date(),
    },
    60,
    (error, result) => {
        if (error) {
            throw error;
        }

        result?.valueOf();
    },
);

store.get('client').then((value) => {
    if (value) {
        value.firstRequest.getTime();
        value.lastRequest.getTime();
        value.count.toFixed();
    }
});

store.get('client', (error, value) => {
    if (error) {
        throw error;
    }

    value?.lastRequest.getTime();
});

store.increment('client', 60);
store.increment('client', 60, (error, result) => {
    if (error) {
        throw error;
    }

    result?.valueOf();
});

store.reset('client');
store.reset('client', (error, result) => {
    if (error) {
        throw error;
    }

    result?.valueOf();
});

store.clearExpired();
store.clearExpired((error, result) => {
    if (error) {
        throw error;
    }

    result?.valueOf();
});
