/**
 * Reads the paths a change touches (one per line, as `git diff --name-only` prints them) from the
 * standard input and prints which Rust workflows it has to run, as the `name=true|false` lines that
 * the `changes` job of `.github/workflows/test.yml` appends to `$GITHUB_OUTPUT`.
 *
 * ```sh
 * git diff --name-only --no-renames HEAD^1 HEAD | node --experimental-strip-types scripts/ci-gate/index.ts
 * ```
 */
import { readFileSync } from 'node:fs';

import { RUST_GATES, touchedGates } from './changes.ts';

const files = readFileSync(0, 'utf8')
	.split('\n')
	.filter(line => line !== '');
const touched = touchedGates(files);

for (const gate of Object.keys(RUST_GATES) as (keyof typeof RUST_GATES)[]) {
	process.stdout.write(`${gate}=${touched[gate]}\n`);
}
