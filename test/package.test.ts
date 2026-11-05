import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'vitest';

test('published package installs and supports CommonJS and typed consumers', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'brute-knex-consumer-'));
    const project = path.join(__dirname, '..');
    const run = (command: string, args: string[], cwd = directory) =>
        execFileSync(command, args, { cwd, encoding: 'utf8', timeout: 90000 });

    try {
        run('pnpm', ['pack', '--pack-destination', directory], project);
        const tarball = fs.readdirSync(directory).find((file) => file.endsWith('.tgz'));
        if (!tarball) {
            throw new Error('pnpm pack did not create a tarball');
        }

        fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ private: true }));
        const { devDependencies } = require('../package.json');
        run('pnpm', [
            'add',
            path.join(directory, tarball),
            `sqlite3@${devDependencies.sqlite3}`,
            '--allow-build',
            'sqlite3',
        ]);

        for (const fixture of ['commonjs.cjs', 'types.ts']) {
            fs.copyFileSync(
                path.join(__dirname, 'fixtures', 'package', fixture),
                path.join(directory, fixture),
            );
        }
        run(process.execPath, ['commonjs.cjs']);
        run(process.execPath, [
            path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc'),
            '--noEmit',
            '--strict',
            // Knex 2.4.2 has existing TS2344 constraint errors in its own declarations.
            '--skipLibCheck',
            '--module',
            'Node20',
            '--moduleResolution',
            'nodenext',
            '--target',
            'ES2020',
            'types.ts',
        ]);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
}, 120000);
