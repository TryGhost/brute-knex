'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const KnexStore = require('../index');

const knexFactory = require('knex');

const dialects = (process.env.BRUTE_KNEX_DIALECTS || 'sqlite')
    .split(',')
    .map((dialect) => dialect.trim())
    .filter(Boolean);

let counter = 0;

function tableName(dialect) {
    counter += 1;
    return `brute_${dialect}_${counter}`;
}

function makeValue(count) {
    const now = new Date();
    return {
        count,
        firstRequest: now,
        lastRequest: now,
    };
}

function createKnex(dialect) {
    if (dialect === 'sqlite') {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brute-knex-'));
        const filename = path.join(dir, 'test.sqlite');
        const knex = knexFactory({
            client: 'sqlite3',
            connection: { filename },
            pool: { min: 1, max: 1 },
            useNullAsDefault: true,
        });

        return {
            knex,
            cleanup: async () => {
                await knex.destroy();
                fs.rmSync(dir, { force: true, recursive: true });
            },
        };
    }

    if (dialect === 'postgres') {
        const knex = knexFactory({
            client: 'pg',
            connection: {
                database: process.env.POSTGRES_DB || 'brute_knex_test',
                host: process.env.POSTGRES_HOST || '127.0.0.1',
                password: process.env.POSTGRES_PASSWORD || 'postgres',
                port: Number(process.env.POSTGRES_PORT || 5432),
                user: process.env.POSTGRES_USER || 'postgres',
            },
        });

        return {
            knex,
            cleanup: () => knex.destroy(),
        };
    }

    if (dialect === 'mysql') {
        const knex = knexFactory({
            client: 'mysql2',
            connection: {
                database: process.env.MYSQL_DATABASE || 'brute_knex_test',
                host: process.env.MYSQL_HOST || '127.0.0.1',
                password: process.env.MYSQL_PASSWORD || 'root',
                port: Number(process.env.MYSQL_PORT || 3306),
                user: process.env.MYSQL_USER || 'root',
            },
            pool: { min: 1, max: 1 },
        });

        return {
            knex,
            cleanup: () => knex.destroy(),
        };
    }

    throw new Error(`Unsupported dialect: ${dialect}`);
}

async function createStore(dialect, options) {
    const context = createKnex(dialect);
    const tablename = options && options.tablename ? options.tablename : tableName(dialect);
    const store = new KnexStore(
        Object.assign({}, options, {
            knex: context.knex,
            tablename,
        }),
    );

    await store.ready;

    return {
        knex: context.knex,
        store,
        tablename,
        cleanup: async () => {
            await context.knex.schema.dropTableIfExists(tablename);
            await context.cleanup();
        },
    };
}

async function createTable(knex, tablename) {
    await knex.schema.createTable(tablename, (table) => {
        table.string('key');
        table.bigInteger('firstRequest').nullable();
        table.bigInteger('lastRequest').nullable();
        table.bigInteger('lifetime').nullable();
        table.integer('count');
    });
}

const describeDefaultSqlite = dialects.includes('sqlite') ? describe : describe.skip;

describeDefaultSqlite('default sqlite store', () => {
    const defaultDbPath = path.join(process.cwd(), 'brute-knex.sqlite');

    afterEach(() => {
        if (fs.existsSync(defaultDbPath)) {
            fs.unlinkSync(defaultDbPath);
        }
    });

    test('constructs without options', async () => {
        const store = new KnexStore();

        await store.ready;
        await store.set('default', makeValue(1), 60);

        const result = await store.get('default');

        expect(result.count).toBe(1);
        await store.knex.destroy();
    });

    test('does not leave thrown callback errors as unhandled rejections', () => {
        const script = `
      const knexFactory = require('knex');
      const KnexStore = require('./index');
      const knex = knexFactory({
        client: 'sqlite3',
        connection: {filename: ':memory:'},
        pool: {min: 1, max: 1},
        useNullAsDefault: true
      });
      const store = new KnexStore({knex, tablename: 'callback_error_test'});

      process.once('unhandledRejection', async (error) => {
        console.error('unexpected unhandledRejection:', error && error.message);
        await knex.destroy();
        process.exit(1);
      });

      process.once('uncaughtException', async (error) => {
        await knex.destroy();

        if (error.message !== 'callback exploded') {
          console.error('unexpected uncaughtException:', error && error.message);
          process.exit(1);
        }

        process.exit(0);
      });

      store.ready.then(() => {
        return store.set('callback-error', {
          count: 1,
          firstRequest: new Date(),
          lastRequest: new Date()
        }, 60, () => {
          throw new Error('callback exploded');
        });
      }).then(() => {
        setTimeout(() => {
          console.error('callback error was not rethrown');
          process.exit(1);
        }, 50);
      }, async (error) => {
        console.error('store operation failed:', error && error.message);
        await knex.destroy();
        process.exit(1);
      });
    `;

        const result = spawnSync(process.execPath, ['-e', script], {
            cwd: path.join(__dirname, '..'),
            encoding: 'utf8',
        });

        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
    });
});

describe.each(dialects)('%s store', (dialect) => {
    let context;

    afterEach(async () => {
        if (context) {
            await context.cleanup();
            context = null;
        }
    });

    test('returns null when no value is available', async () => {
        context = await createStore(dialect);

        await expect(context.store.get('missing')).resolves.toBeNull();
    });

    test('sets records and updates existing records', async () => {
        context = await createStore(dialect);

        await context.store.set('client', makeValue(2), 60);
        await context.store.set('client', makeValue(5), 60);

        const result = await context.store.get('client');

        expect(result.count).toBe(5);
        expect(result.firstRequest).toBeInstanceOf(Date);
        expect(result.lastRequest).toBeInstanceOf(Date);
    });

    test('expires records before returning them', async () => {
        context = await createStore(dialect);

        await context.store.set('expired', makeValue(1), -1);

        await expect(context.store.get('expired')).resolves.toBeNull();
    });

    test('resets records', async () => {
        context = await createStore(dialect);

        await context.store.set('reset', makeValue(3), 60);
        await context.store.reset('reset');

        await expect(context.store.get('reset')).resolves.toBeNull();
    });

    test('increments new and existing records', async () => {
        context = await createStore(dialect);

        await context.store.increment('increment', 60);
        await context.store.increment('increment', 60);

        const result = await context.store.get('increment');

        expect(result.count).toBe(2);
    });

    test('supports callback-style calls', async () => {
        context = await createStore(dialect);

        await new Promise((resolve, reject) => {
            context.store.set('callback', makeValue(7), 60, (error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        const result = await new Promise((resolve, reject) => {
            context.store.get('callback', (error, value) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(value);
            });
        });

        expect(result.count).toBe(7);

        await new Promise((resolve, reject) => {
            context.store.increment('callback-increment', 60, (error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        const incremented = await context.store.get('callback-increment');

        expect(incremented.count).toBe(1);

        await new Promise((resolve, reject) => {
            context.store.reset('callback-increment', (error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        await expect(context.store.get('callback-increment')).resolves.toBeNull();

        await context.store.set('callback-expired', makeValue(3), -1);

        await new Promise((resolve, reject) => {
            context.store.clearExpired((error) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });

        await expect(context.store.get('callback-expired')).resolves.toBeNull();
    });

    test('can use a pre-existing table when table creation is disabled', async () => {
        const setup = createKnex(dialect);
        const tablename = tableName(`${dialect}_manual`);
        await createTable(setup.knex, tablename);

        context = {
            knex: setup.knex,
            store: new KnexStore({
                createTable: false,
                knex: setup.knex,
                tablename,
            }),
            tablename,
            cleanup: async () => {
                await setup.knex.schema.dropTableIfExists(tablename);
                await setup.cleanup();
            },
        };

        await context.store.ready;
        await context.store.set('manual', makeValue(9), 60);

        const result = await context.store.get('manual');

        expect(result.count).toBe(9);
    });
});
