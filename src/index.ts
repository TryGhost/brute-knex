import knexFactory, { type Knex } from 'knex';
import AbstractClientStore = require('express-brute/lib/AbstractClientStore');

// express-brute has no declarations for its base store. Its only method,
// increment, is overridden below; keep that implementation's types local.
const ClientStore: new (...args: unknown[]) => object = AbstractClientStore;

/** Surface callback exceptions as uncaught exceptions, matching the callback API. */
function rethrowAsync(error: unknown): void {
    setTimeout(() => {
        throw error;
    }, 0);
}

/** Notify an optional callback while preserving the original promise result. */
function withCallback<TResult>(
    promise: PromiseLike<TResult>,
    callback?: KnexStore.ResultCallback<TResult>,
): Promise<TResult> {
    const resolvedPromise = Promise.resolve(promise);

    if (typeof callback === 'function') {
        const onRejected: KnexStore.ResultCallback = (error) => {
            callback(error);
        };
        const callbackPromise = resolvedPromise.then((result) => {
            callback(null, result);
        }, onRejected);

        callbackPromise.catch(rethrowAsync);
    }

    return resolvedPromise;
}

interface StoredRow {
    key: string;
    firstRequest: number | string | null;
    lastRequest: number | string | null;
    lifetime: number | string | null;
    count: number;
}

/** Knex-backed express-brute store using UTC millisecond timestamps. */
class KnexStore extends ClientStore {
    static defaults: KnexStore.Defaults = {
        tablename: 'brute',
        createTable: true,
    };

    static defaultsKnex: Knex.Config = {
        client: 'better-sqlite3',
        connection: {
            filename: './brute-knex.sqlite',
        },
        useNullAsDefault: true,
    };

    knex: Knex;
    options: KnexStore.Options & KnexStore.Defaults;
    ready: Promise<void>;

    constructor(options: KnexStore.Options = {}) {
        super(options);
        this.options = Object.assign({}, KnexStore.defaults, options);

        this.knex = this.options.knex || knexFactory(KnexStore.defaultsKnex);

        if (options.createTable === false) {
            this.ready = Promise.resolve();
        } else {
            this.ready = this.knex.schema.hasTable(this.options.tablename).then((exists) => {
                if (!exists) {
                    return this.knex.schema.createTable(this.options.tablename, (table) => {
                        table.string('key');
                        table.bigInteger('firstRequest').nullable();
                        table.bigInteger('lastRequest').nullable();
                        table.bigInteger('lifetime').nullable();
                        table.integer('count');
                    });
                }
                return undefined;
            });
        }

        this.ready = Promise.resolve(this.ready);
    }

    set(
        key: string,
        value: KnexStore.StoredValueInput,
        lifetime: number,
        callback?: KnexStore.ResultCallback,
    ): Promise<unknown> {
        lifetime = lifetime || 0;

        return withCallback(
            this.ready.then(() => {
                return this.knex.transaction(async (trx) => {
                    const foundKeys = await trx<StoredRow>(this.options.tablename)
                        .select('*')
                        .forUpdate()
                        .where('key', '=', key);
                    const record = {
                        lifetime: Date.now() + lifetime * 1000,
                        count: value.count,
                        lastRequest: new Date(value.lastRequest).getTime(),
                    };

                    if (foundKeys.length === 0) {
                        return trx<StoredRow>(this.options.tablename).insert({
                            ...record,
                            key,
                            firstRequest: new Date(value.firstRequest).getTime(),
                        });
                    }

                    return trx<StoredRow>(this.options.tablename)
                        .where('key', '=', key)
                        .update(record);
                });
            }),
            callback,
        );
    }

    get(key: string, callback?: KnexStore.GetCallback): Promise<KnexStore.StoredValue | null> {
        return withCallback(
            this.ready
                .then(() => {
                    return this.clearExpired();
                })
                .then(() => {
                    return this.knex<StoredRow>(this.options.tablename)
                        .select('*')
                        .where('key', '=', key);
                })
                .then((response) => {
                    const row = response[0];
                    if (!row) {
                        return null;
                    }

                    return {
                        lastRequest: new Date(row.lastRequest === null ? 0 : row.lastRequest),
                        firstRequest: new Date(row.firstRequest === null ? 0 : row.firstRequest),
                        count: row.count,
                    };
                }),
            callback,
        );
    }

    reset(key: string, callback?: KnexStore.ResultCallback): Promise<unknown> {
        return withCallback(
            this.ready.then(() => {
                return this.knex<StoredRow>(this.options.tablename).where('key', '=', key).del();
            }),
            callback,
        );
    }

    increment(
        key: string,
        lifetime: number,
        callback?: KnexStore.ResultCallback,
    ): Promise<unknown> {
        return withCallback(
            this.get(key).then<number | number[]>((result) => {
                if (result) {
                    return this.knex<StoredRow>(this.options.tablename)
                        .increment('count', 1)
                        .where('key', '=', key);
                } else {
                    const now = Date.now();

                    return this.knex<StoredRow>(this.options.tablename).insert({
                        key,
                        firstRequest: now,
                        lastRequest: now,
                        lifetime: now + lifetime * 1000,
                        count: 1,
                    });
                }
            }),
            callback,
        );
    }

    clearExpired(callback?: KnexStore.ResultCallback): Promise<unknown> {
        return withCallback(
            this.ready.then(() => {
                return this.knex<StoredRow>(this.options.tablename)
                    .del()
                    .where('lifetime', '<', Date.now());
            }),
            callback,
        );
    }
}

namespace KnexStore {
    export type TimestampInput = Date | number | string;

    export interface StoredValueInput {
        count: number;
        firstRequest: TimestampInput;
        lastRequest: TimestampInput;
    }

    export interface StoredValue {
        count: number;
        firstRequest: Date;
        lastRequest: Date;
    }

    export interface Options {
        createTable?: boolean;
        knex?: Knex;
        tablename?: string;
    }

    export interface Defaults {
        createTable: boolean;
        tablename: string;
    }

    export type ResultCallback<TResult = unknown> = (error: Error | null, result?: TResult) => void;
    export type GetCallback = (error: Error | null, value?: StoredValue | null) => void;
}

export = KnexStore;
