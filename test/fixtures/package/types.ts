import KnexStore = require('@tryghost/brute-knex');

declare const knex: NonNullable<KnexStore.Options['knex']>;

const options: KnexStore.Options = { knex, createTable: false, tablename: 'brute' };
const store = new KnexStore(options);
const ready: Promise<void> = store.ready;
const connection: NonNullable<KnexStore.Options['knex']> = store.knex;
const defaults: KnexStore.Defaults = KnexStore.defaults;
const client = KnexStore.defaultsKnex.client;

void [ready, connection, defaults, client, new KnexStore()];

const value: KnexStore.StoredValueInput = {
    count: 2,
    firstRequest: new Date(),
    lastRequest: '2026-01-01T00:01:00.000Z',
};

store.set('consumer', value, 60, (error: Error | null) => {
    error?.message.toUpperCase();
});
store.set('numeric-timestamp', { ...value, lastRequest: 0 }, 60);
const callback: KnexStore.ResultCallback = (error, result) => {
    error?.message.toUpperCase();
    result?.valueOf();
};
store.increment('consumer', 60);
store.increment('consumer', 60, callback);
store.reset('consumer');
store.reset('consumer', callback);
store.clearExpired();
store.clearExpired(callback);

const result: Promise<KnexStore.StoredValue | null> = store.get('consumer');
void result;

store.get('consumer', (error, stored) => {
    error?.message.toUpperCase();
    if (stored) {
        stored.firstRequest.getTime();
        stored.lastRequest.getTime();
        stored.count.toFixed();
        // @ts-expect-error Stored timestamps are Dates, not the accepted input strings.
        stored.firstRequest.toUpperCase();
        // @ts-expect-error Counts are numeric.
        stored.count.toUpperCase();
    }
});

// @ts-expect-error Keys are strings.
store.get(123);
// @ts-expect-error Values require a numeric count.
store.set('consumer', { ...value, count: '2' }, 60);
