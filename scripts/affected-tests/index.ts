/**
 * Runs the specs that a change can affect (`yarn test:affected`).
 *
 * ```sh
 * yarn test:affected [--base origin/dev] [--head HEAD] [--print] [-- <vitest args>]
 * ```
 *
 * It diffs `<base>...<head>` (the merge base of the two), so it sees what is committed and not what
 * is in the working tree: commit first. `--base` is the branch the work goes to (`origin/v6` on the
 * v6 line, where the default would diff against the wrong tree). It asks {@link plan} which specs to run, and
 * hands them to `vitest related`. Build first: a spec reaches another package through its `lib/`,
 * and the selection passes the build output of a changed file to `vitest related`. When the plan is
 * `full`, it runs the whole suite, as the merge queue does. `--print` shows the plan and stops.
 * Arguments after `--` go to vitest, for a `--config` of another set of specs.
 *
 * `vitest related` is given the files, not the specs, because a spec that was never named could
 * still import one of them; the specs the plan names are in the list as well and run themselves.
 */
import type { Change, ChangeStatus, Plan } from './classify.ts';

import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { plan } from './classify.ts';
import { createProbe, root } from './probe.ts';

/**
 * Reads the files that differ from the merge base of `base` and `head`.
 *
 * @param base - A ref of the branch the work goes to
 * @param head - A ref of the work
 * @returns `null` when git cannot take the difference (the base is not a ref of this checkout)
 */
function readChanges(base: string, head: string): Change[] | null {
	// `--no-renames` reports a move as a deletion and an addition, as the plan treats each path alone.
	const diff = spawnSync('git', ['diff', '--name-status', '--no-renames', '-z', `${base}...${head}`], {
		cwd: root,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	if (diff.status !== 0) {
		return null;
	}
	const fields = diff.stdout.split('\0').filter(Boolean);
	const changes: Change[] = [];
	for (let index = 0; index + 1 < fields.length; index += 2) {
		const letter = fields[index]?.[0];
		const file = fields[index + 1];
		if (file !== undefined) {
			// A type change (`T`, a file that became a symlink) or any status that is not an addition or
			// a deletion is a modification: dropping the file would shrink the plan.
			const status: ChangeStatus = letter === 'A' || letter === 'D' ? letter : 'M';
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

	// A difference that cannot be taken is a change that cannot be placed: run everything, as the plan
	// does for a file it cannot place, rather than fail after the retries of the workflow.
	const changes = readChanges(values.base, values.head);
	const result: Plan =
		changes === null
			? { mode: 'full', reason: `git could not take the difference of ${values.base}...${values.head}` }
			: plan(changes, createProbe());

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
