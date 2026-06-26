import type { Knex } from 'knex';

declare namespace KnexStore {
    type TimestampInput = Date | number | string;

    interface StoredValueInput {
        count: number;
        firstRequest: TimestampInput;
        lastRequest: TimestampInput;
    }

    interface StoredValue {
        count: number;
        firstRequest: Date;
        lastRequest: Date;
    }

    interface Options {
        createTable?: boolean;
        knex?: Knex;
        tablename?: string;
    }

    interface Defaults {
        createTable: boolean;
        tablename: string;
    }

    type ResultCallback<TResult = unknown> = (error: Error | null, result?: TResult) => void;
    type GetCallback = (error: Error | null, value?: StoredValue | null) => void;
}

declare class KnexStore {
    static defaults: KnexStore.Defaults;
    static defaultsKnex: Knex.Config;

    constructor(options?: KnexStore.Options);

    knex: Knex;
    options: KnexStore.Options & KnexStore.Defaults;
    ready: Promise<void>;

    set(
        key: string,
        value: KnexStore.StoredValueInput,
        lifetime: number,
        callback?: KnexStore.ResultCallback,
    ): Promise<unknown>;

    get(key: string, callback?: KnexStore.GetCallback): Promise<KnexStore.StoredValue | null>;

    reset(key: string, callback?: KnexStore.ResultCallback): Promise<unknown>;

    increment(key: string, lifetime: number, callback?: KnexStore.ResultCallback): Promise<unknown>;

    clearExpired(callback?: KnexStore.ResultCallback): Promise<unknown>;
}

export = KnexStore;
