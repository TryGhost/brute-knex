'use strict';

function rethrowAsync(error) {
    setTimeout(() => {
        throw error;
    }, 0);
}

function withCallback(promise, callback) {
    const resolvedPromise = Promise.resolve(promise);

    if (typeof callback === 'function') {
        const callbackPromise = resolvedPromise.then(
            (result) => {
                callback(null, result);
            },
            (error) => {
                callback(error);
            },
        );

        callbackPromise.catch(rethrowAsync);
    }

    return resolvedPromise;
}

/**
 * we are using bigInteger to store a UTC timestamp
 * alternative would be using moment-timezone to store YYYY-MM-DD HH:mm:ss (but it does not contain ms)
 *
 * @type {module.exports}
 */
const KnexStore = (module.exports = function KnexStore(options = {}) {
    this.options = Object.assign({}, KnexStore.defaults, options);

    if (this.options.knex) {
        this.knex = this.options.knex;
    } else {
        this.knex = require('knex')(KnexStore.defaultsKnex);
    }

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
        });
    }

    this.ready = Promise.resolve(this.ready);
});

KnexStore.prototype.set = function (key, value, lifetime, callback) {
    lifetime = lifetime || 0;

    return withCallback(
        this.ready.then(() => {
            return this.knex.transaction((trx) => {
                return trx
                    .select('*')
                    .forUpdate()
                    .from(this.options.tablename)
                    .where('key', '=', key)
                    .then((foundKeys) => {
                        const expiresAt = Date.now() + lifetime * 1000;

                        if (foundKeys.length === 0) {
                            return trx.from(this.options.tablename).insert({
                                key,
                                lifetime: expiresAt,
                                lastRequest: new Date(value.lastRequest).getTime(),
                                firstRequest: new Date(value.firstRequest).getTime(),
                                count: value.count,
                            });
                        } else {
                            return trx(this.options.tablename)
                                .where('key', '=', key)
                                .update({
                                    lifetime: expiresAt,
                                    count: value.count,
                                    lastRequest: new Date(value.lastRequest).getTime(),
                                });
                        }
                    });
            });
        }),
        callback,
    );
};

KnexStore.prototype.get = function (key, callback) {
    return withCallback(
        this.ready
            .then(() => {
                return this.clearExpired();
            })
            .then(() => {
                return this.knex.select('*').from(this.options.tablename).where('key', '=', key);
            })
            .then((response) => {
                let value = null;

                const row = response[0];
                if (row) {
                    value = {};
                    value.lastRequest = new Date(row.lastRequest);
                    value.firstRequest = new Date(row.firstRequest);
                    value.count = row.count;
                }

                return value;
            }),
        callback,
    );
};
KnexStore.prototype.reset = function (key, callback) {
    return withCallback(
        this.ready.then(() => {
            return this.knex(this.options.tablename).where('key', '=', key).del();
        }),
        callback,
    );
};

KnexStore.prototype.increment = function (key, lifetime, callback) {
    return withCallback(
        this.get(key).then((result) => {
            if (result) {
                return this.knex(this.options.tablename)
                    .increment('count', 1)
                    .where('key', '=', key);
            } else {
                const now = Date.now();

                return this.knex(this.options.tablename).insert({
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
};

KnexStore.prototype.clearExpired = function (callback) {
    return withCallback(
        this.ready.then(() => {
            return this.knex(this.options.tablename).del().where('lifetime', '<', Date.now());
        }),
        callback,
    );
};

KnexStore.defaults = {
    tablename: 'brute',
    createTable: true,
};

KnexStore.defaultsKnex = {
    client: 'sqlite3',
    // debug: true,
    connection: {
        filename: './brute-knex.sqlite',
    },
    useNullAsDefault: true,
};
