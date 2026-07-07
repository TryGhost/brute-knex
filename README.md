# @tryghost/brute-knex

Knex-backed store for [express-brute](https://github.com/AdamPflug/express-brute) that persists rate-limit state in SQL databases.

## What It Does

`@tryghost/brute-knex` lets `express-brute` share brute-force counters through a Knex table instead of keeping them in process memory. It can create its storage table automatically, use a caller-provided Knex instance, or fall back to a local SQLite database when no Knex instance is supplied.

The package supports Node.js `>=20.20.0`. CI exercises the store against SQLite, MySQL, and Postgres using Knex `2.4.2`, the version currently shared by Ghost and Daisy.

## Installation

Install the package and the Knex database driver your app uses:

```sh
npm install @tryghost/brute-knex knex mysql2
```

Use `pg` instead of `mysql2` for Postgres, or `sqlite3` for SQLite.

## Usage

```js
const ExpressBrute = require('express-brute');
const Knex = require('knex');
const BruteKnex = require('@tryghost/brute-knex');

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

This repo uses the organisation default Node.js `22` for local development through `.nvmrc`, and pnpm `10.x` through Corepack. Package support still starts at Node.js `20.20.0` for existing consumers.

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

Use [config.example.json](config.example.json) as a local Knex/store configuration blueprint when setting up those databases outside CI.

## Releasing

Releases are handled by [`@tryghost/pro-ship`](https://www.npmjs.com/package/@tryghost/pro-ship):

```sh
pnpm ship
```

The `ship` script bumps the version, creates the release commit and tag, and pushes them. The push to `main` triggers the [Publish workflow](.github/workflows/publish.yml), which publishes `@tryghost/brute-knex` to npm through [trusted publishing](https://docs.npmjs.com/trusted-publishers) (GitHub Actions OIDC) — no npm tokens are involved. The workflow skips versions that are already on npm and can be run manually as a dry run from the Actions tab.

## Copyright & License

Copyright (c) 2014, llambda <xxgsoftware@gmail.com>.
Released under the [ISC license](LICENSE).
