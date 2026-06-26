# AGENTS.md

This is a small CommonJS package for `express-brute`; start with `README.md` for usage context.

## Commands

Use the organisation default Node.js `22` from `.nvmrc`, Corepack, and pnpm 10.x:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm lint
```

Database-specific checks:

```sh
pnpm run test:e2e:sqlite
pnpm run test:e2e:mysql
pnpm run test:e2e:postgres
```

MySQL and Postgres tests need local services unless running in GitHub Actions. The suite reads `MYSQL_*` and `POSTGRES_*` env vars from `test/knex-store.test.js`.

## Boundaries

- Keep Node.js `20.20.0` as the minimum support floor; existing consumers depend on that.
- Keep pnpm on `10.x` while Node `20.20.0` is supported. pnpm 11 requires newer Node.
- Preserve the local Renovate guards for Node, pnpm, Knex, and MySQL compatibility.
- Do not mix schema or behavior changes, such as unique-key/upsert changes, into tooling or docs PRs. Those need focused SQLite/MySQL/Postgres compatibility tests.
- If changing store behavior, run the default SQLite path and the relevant database e2e command before handing off.
