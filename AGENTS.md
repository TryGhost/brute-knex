# AGENTS.md

This is a small CommonJS package for `express-brute`; start with `README.md` for usage context.

## Commands

Use `.nvmrc` for local development, Corepack, and the pnpm version pinned in `package.json`:

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

- Treat `engines.node` in `package.json` as the minimum support floor. Keep CI coverage of that exact baseline and newer Node.js versions for forward compatibility.
- Allow Renovate to update `.nvmrc`. Local development Node.js versions must remain eligible for updates independently of the support floor.
- Dropping support for a Node.js version requires a major release.
- Knex is a peer dependency (`^3.0.0`); the dev dependency tracks Knex 3. Widening or narrowing the peer range is a breaking change; publish it in a major release.
- Preserve the Renovate guards for the CI Node.js baseline, Knex, and MySQL compatibility. Do not extend the CI baseline guard to the `nvm` manager.
- Do not mix schema or behavior changes, such as unique-key/upsert changes, into tooling or docs PRs. Those need focused SQLite/MySQL/Postgres compatibility tests.
- If changing store behavior, run the default SQLite path and the relevant database e2e command before handing off.
