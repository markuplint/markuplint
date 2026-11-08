/**
 * Runs the specs that a change can affect (`yarn test:affected`).
 *
 * ```sh
 * node scripts/affected-tests/index.ts [--base origin/dev] [--head HEAD] [--print] [-- <vitest args>]
 * ```
 *
 * It diffs `<base>...<head>` (the merge base of the two), asks {@link plan} which specs to run, and
 * hands them to `vitest related`. Build first: a spec reaches another package through its `lib/`,
 * and the selection passes the build output of a changed file to `vitest related`. When the plan is
 * `full`, it runs the whole suite, as the merge queue does. `--print` shows the plan and stops.
 * Arguments after `--` go to vitest, for a `--config` of another set of specs.
 *
 * `vitest related` is given the files, not the specs, because a spec that was never named could
 * still import one of them; the specs the plan names are in the list as well and run themselves.
 */
import type { Change, ChangeStatus } from './classify.ts';

import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { plan } from './classify.ts';
import { createProbe, git, root } from './probe.ts';

function readChanges(base: string, head: string): Change[] {
	// `--no-renames` reports a move as a deletion and an addition, as the plan treats each path alone.
	const fields = git(['diff', '--name-status', '--no-renames', '-z', `${base}...${head}`])
		.split('\0')
		.filter(Boolean);
	const changes: Change[] = [];
	for (let index = 0; index + 1 < fields.length; index += 2) {
		const status = fields[index]?.[0] as ChangeStatus | undefined;
		const file = fields[index + 1];
		if (file !== undefined && (status === 'A' || status === 'M' || status === 'D')) {
			changes.push({ status, path: file });
		}
	}
	return changes;
}

function write(line: string): void {
	process.stdout.write(`${line}\n`);
}

/**
 * @returns The exit code: what vitest returns, or 0 when there is nothing to run
 */
function run(): number {
	const { values, positionals } = parseArgs({
		allowPositionals: true,
		options: {
			base: { type: 'string', default: 'origin/dev' },
			head: { type: 'string', default: 'HEAD' },
			print: { type: 'boolean', default: false },
		},
	});

	const result = plan(readChanges(values.base, values.head), createProbe());

	const summary =
		result.mode === 'full'
			? `Running every spec: ${result.reason}.`
			: `Running the specs that ${result.targets.length} file(s) reach.`;
	write(summary);
	if (process.env.GITHUB_STEP_SUMMARY) {
		appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
	}

	if (values.print) {
		write(JSON.stringify(result, null, 2));
		return 0;
	}

	if (result.mode === 'affected' && result.targets.length === 0) {
		write('No spec is affected.');
		return 0;
	}

	const vitest = path.join(root, 'node_modules/vitest/vitest.mjs');
	const args =
		result.mode === 'full'
			? ['run', ...positionals]
			: ['related', '--run', '--passWithNoTests', ...positionals, ...result.targets];
	const child = spawnSync(process.execPath, [vitest, ...args], { cwd: root, stdio: 'inherit' });
	return child.status ?? 1;
}

process.exitCode = run();
