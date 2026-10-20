# AGENTS.md

This is a small CommonJS package for `express-brute`; start with `README.md` for usage context.

## Commands

Use the production baseline Node.js `22.22.0` from `.nvmrc`, Corepack, and pnpm 10.x:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm lint
```

Publish releases with the shared TryGhost release helper:

```sh
pnpm ship
```

Database-specific checks:

```sh
pnpm run test:e2e:sqlite
pnpm run test:e2e:mysql
pnpm run test:e2e:postgres
```

MySQL and Postgres tests need local services unless running in GitHub Actions. The suite reads `MYSQL_*` and `POSTGRES_*` env vars from `test/knex-store.test.js`.

## Boundaries

- Keep Node.js `22.22.0` as the minimum support floor; Daisy runs that exact version. Test Node 24 for forward compatibility.
- Dropping Node 20 support is a breaking change; publish it in a major release after Daisy's Node 22 runtime declaration is merged.
- Keep Knex aligned with the version currently shared by Ghost and Daisy (`2.4.2` at the time of writing).
- Preserve the local Renovate guards for Node, Knex, and MySQL compatibility.
- Do not mix schema or behavior changes, such as unique-key/upsert changes, into tooling or docs PRs. Those need focused SQLite/MySQL/Postgres compatibility tests.
- If changing store behavior, run the default SQLite path and the relevant database e2e command before handing off.
