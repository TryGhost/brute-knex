# brute-knex

Knex-backed store for [express-brute](https://github.com/AdamPflug/express-brute) that persists rate-limit state in SQL databases.

[![NPM Version][npm-version-image]][npm-url]
[![NPM Downloads][npm-downloads-image]][npm-url]
[![Node.js Version][node-image]][node-url]
[![NPM][npm-image]][npm-url]

## What It Does

`brute-knex` lets `express-brute` share brute-force counters through a Knex table instead of keeping them in process memory. It can create its storage table automatically, use a caller-provided Knex instance, or fall back to a local SQLite database when no Knex instance is supplied.

The package supports Node.js `>=20.20.0`. CI exercises the store against SQLite, MySQL, and Postgres, with additional MySQL coverage for existing consumers that provide Knex `0.21.6`.

## Installation

Install the package and the Knex database driver your app uses:

```sh
npm install brute-knex knex mysql2
```

Use `pg` instead of `mysql2` for Postgres, or `sqlite3` for SQLite.

## Usage

```js
const ExpressBrute = require('express-brute');
const Knex = require('knex');
const BruteKnex = require('brute-knex');

const knex = Knex({
    client: 'mysql2',
    connection: {
        host: '127.0.0.1',
        user: 'root',
        password: 'root',
        database: 'brute_knex'
    }
});

const store = new BruteKnex({
    knex,
    tablename: 'brute'
});

const bruteforce = new ExpressBrute(store, {
    freeRetries: 2
});
```

See [example.js](example.js) for a complete Express route.

## Options

- `tablename`: table name for brute-force records. Defaults to `brute`.
- `knex`: Knex instance to use. If omitted, `brute-knex` creates a SQLite database at `./brute-knex.sqlite`.
- `createTable`: set to `false` when the table already exists and should not be created automatically.

The table stores `key`, `firstRequest`, `lastRequest`, `lifetime`, and `count` columns. Timestamps are stored as UTC millisecond values.

## Development

This repo uses pnpm `10.x` through Corepack. Node.js `20.20.0` is the lowest supported runtime required by existing consumers.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm lint
```

Database-specific test commands:

```sh
pnpm run test:e2e:sqlite
pnpm run test:e2e:mysql
pnpm run test:e2e:postgres
```

The MySQL and Postgres commands expect local test databases unless they are running inside the GitHub Actions service containers. The test suite reads standard connection env vars such as `MYSQL_HOST`, `MYSQL_DATABASE`, `POSTGRES_HOST`, and `POSTGRES_DB`.

## Copyright & License

Released under the [ISC license](LICENSE).

[npm-version-image]: https://img.shields.io/npm/v/brute-knex.svg
[npm-downloads-image]: https://img.shields.io/npm/dm/brute-knex.svg
[npm-image]: https://nodei.co/npm/brute-knex.png?downloads=true&downloadRank=true&stars=true
[npm-url]: https://npmjs.org/package/brute-knex
[node-image]: https://img.shields.io/node/v/brute-knex.svg
[node-url]: https://nodejs.org/download/
