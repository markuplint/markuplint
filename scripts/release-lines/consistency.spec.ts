/**
 * Fails when a configuration that names a branch disagrees with `RELEASE_LINES`, so that a
 * rotation of the lines (the `major-rotation` skill) cannot leave one behind. Each check holds on
 * every line's tree: a file that only one line has is not read here.
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { RELEASE_LINES, linesWithRole } from './lines.ts';

const root = path.resolve(import.meta.dirname, '../..');

function read(file: string): string {
	return readFileSync(path.join(root, file), 'utf8');
}

const sorted = (values: Iterable<string>) => [...new Set(values)].toSorted();

const allBranches = sorted(RELEASE_LINES.map(line => line.branch));

/**
 * The branch names under every `branches:` / `branches-ignore:` key of a workflow, in either the
 * block form (`- dev` on the following lines) or the flow form (`[dev, v6]`).
 */
function workflowBranches(source: string): readonly string[] {
	const found: string[] = [];
	const lines = source.split('\n');
	for (const [index, line] of lines.entries()) {
		const key = /^( *)branches(?:-ignore)?:(.*)$/.exec(line);
		if (!key) {
			continue;
		}
		const [, indent = '', rest = ''] = key;
		const flow = /^\[(.*)\]/.exec(rest.trim());
		if (flow) {
			found.push(...(flow[1] ?? '').split(',').map(unquote).filter(Boolean));
			continue;
		}
		for (const next of lines.slice(index + 1)) {
			const item = /^( *)- (.*)$/.exec(next);
			if (!item || (item[1] ?? '').length <= indent.length) {
				break;
			}
			found.push(unquote((item[2] ?? '').replace(/#.*$/, '')));
		}
	}
	return found;
}

function unquote(value: string): string {
	return value.trim().replaceAll(/^['"]|['"]$/g, '');
}

describe('workflowBranches', () => {
	test('reads the block and the flow form', () => {
		const source = [
			'on:',
			'  pull_request:',
			'    branches:',
			'      - dev',
			"      - 'v4' # comment",
			'  push:',
			'    branches: [dev, "v6"]',
			'jobs: {}',
		].join('\n');
		expect(workflowBranches(source)).toStrictEqual(['dev', 'v4', 'dev', 'v6']);
	});
});

describe('the configurations follow RELEASE_LINES', () => {
	test('Renovate targets every line', () => {
		const config = JSON.parse(read('.github/renovate.json')) as { baseBranchPatterns: string[] };
		expect(sorted(config.baseBranchPatterns)).toStrictEqual(allBranches);
	});

	test('Renovate disables regular updates on the lts lines only', () => {
		const config = JSON.parse(read('.github/renovate.json')) as {
			packageRules: { matchBaseBranches?: string[]; enabled?: boolean }[];
		};
		const disabled = config.packageRules
			.filter(rule => rule.enabled === false && rule.matchBaseBranches)
			.flatMap(rule => rule.matchBaseBranches ?? []);
		expect(sorted(disabled)).toStrictEqual(sorted(linesWithRole('lts').map(line => line.branch)));
	});

	test('the PR labeler gives each line its major as a label', () => {
		const labels = new Map(
			[...read('.github/labeler.yml').matchAll(/^(v\d+):\n +- base-branch: \[([^\]]*)\]/gm)].map(
				([, label = '', branches = '']) => [label, sorted(branches.split(',').map(unquote))],
			),
		);
		expect(Object.fromEntries(labels)).toStrictEqual(
			Object.fromEntries(RELEASE_LINES.map(line => [`v${line.major}`, [line.branch]])),
		);
	});

	test('the commit guard covers the stable and experimental branches', () => {
		const guarded = [...read('.husky/pre-commit').matchAll(/"\$branch_name"\s*=\s*"([^"]+)"/g)].map(
			([, branch = '']) => branch,
		);
		const expected = [...linesWithRole('stable'), ...linesWithRole('experimental')].map(line => line.branch);
		expect(sorted(guarded)).toStrictEqual(sorted(expected));
	});

	test.each(readdirSync(path.join(root, '.github/workflows')).filter(file => /\.ya?ml$/.test(file)))(
		'%s triggers on line branches only',
		file => {
			const branches = workflowBranches(read(`.github/workflows/${file}`));
			expect(branches.filter(branch => !allBranches.includes(branch))).toStrictEqual([]);
		},
	);

	test('the Branch Topology table of CLAUDE.md lists each line with its role', () => {
		const rows = [...read('CLAUDE.md').matchAll(/^\|\s*`([^`]+)`\s*\|\s*v(\d+)\s*\|\s*`([a-z]+)`/gm)].map(
			([, branch = '', major = '', role = '']) => ({ major: Number(major), role, branch }),
		);
		expect(rows.toSorted((a, b) => a.major - b.major)).toStrictEqual(
			RELEASE_LINES.map(({ major, role, branch }) => ({ major, role, branch })).toSorted(
				(a, b) => a.major - b.major,
			),
		);
	});
});
