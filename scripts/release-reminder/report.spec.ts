import type { Commit, Git } from './report.ts';

import { describe, expect, test } from 'vitest';

import { DUE_AFTER_MS, checkLine, manifestChanges, marker, newestRelease, npmIgnore, renderIssue } from './report.ts';

describe('newestRelease', () => {
	test('takes the highest stable version of the major, not the newest tag', () => {
		expect(newestRelease(['v5.6.1', 'v5.10.0', 'v5.9.3', 'v4.18.5', 'v6.0.0'], 5)).toBe('v5.10.0');
	});

	test('skips prereleases and per-package tags', () => {
		expect(newestRelease(['v5.0.0-rc.7', '@markuplint/ml-core@5.1.0', 'v5.0.0'], 5)).toBe('v5.0.0');
	});

	test('is null for a line without a release', () => {
		expect(newestRelease(['v5.6.1', 'v5.0.0-alpha.3'], 6)).toBeNull();
	});
});

describe('npmIgnore', () => {
	const ignored = npmIgnore(['src', 'tsconfig*', 'generator/', '/build.ts', '!scaffold/package/src', ''].join('\n'));

	test.each([
		['src/index.ts', true],
		['scaffold/src/index.ts', true],
		['tsconfig.build.json', true],
		['generator/a.ts', true],
		['build.ts', true],
		['lib/build.ts', false],
		['scaffold/package/src/index.ts', false],
		['lib/index.js', false],
		['generator', false],
		['index.json', false],
	])('%s → %s', (path, expected) => {
		expect(ignored(path)).toBe(expected);
	});
});

describe('manifestChanges', () => {
	test('lists changed entries of the fields that reach a consumer', () => {
		const before = JSON.stringify({
			version: '1.0.0',
			dependencies: { a: '^1.0.0', b: '^1.0.0' },
			devDependencies: { c: '1.0.0' },
			engines: { node: '>=24' },
		});
		const after = JSON.stringify({
			version: '1.0.1',
			dependencies: { a: '^1.0.1', d: '^1.0.0' },
			devDependencies: { c: '2.0.0' },
			engines: { node: '>=24' },
			type: 'module',
		});
		expect(manifestChanges(before, after)).toStrictEqual([
			'package.json#dependencies.a',
			'package.json#dependencies.b',
			'package.json#dependencies.d',
			'package.json#type',
		]);
	});
});

const DAY = 24 * 60 * 60;
const NOW = 100 * DAY * 1000;

/**
 * A repository of revisions, each a map of files. `firstParents` and `commits` hold the history
 * of `branch` after the tag; the parent of each commit is the one before it.
 */
function repository(options: {
	readonly tag: Record<string, string>;
	readonly history: readonly (Commit & { readonly files: Record<string, string> })[];
	readonly merged?: readonly Commit[];
}): Git {
	const revisions = new Map<string, Record<string, string>>([['v1.0.0', options.tag]]);
	let previous = 'v1.0.0';
	for (const commit of options.history) {
		revisions.set(commit.sha, commit.files);
		revisions.set(`${commit.sha}^1`, revisions.get(previous) ?? {});
		previous = commit.sha;
	}
	revisions.set('branch', revisions.get(previous) ?? {});
	const files = (rev: string) => revisions.get(rev) ?? {};
	return {
		tags: () => ['v1.0.0', 'v0.9.0'],
		diffNames: (from, to, dir) => {
			const a = files(from);
			const b = files(to);
			return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(
				path => path.startsWith(`${dir}/`) && a[path] !== b[path],
			);
		},
		show: (rev, path) => files(rev)[path] ?? null,
		listFiles: (rev, dir) => Object.keys(files(rev)).filter(path => path.startsWith(`${dir}/`)),
		firstParents: () => options.history.map(({ sha, time, subject }) => ({ sha, time, subject })),
		commits: () => [
			...(options.merged ?? []),
			...options.history.map(({ sha, time, subject }) => ({ sha, time, subject })),
		],
	};
}

const manifest = (fields: Record<string, unknown>) => JSON.stringify({ name: '@scope/a', version: '1.0.0', ...fields });

const base = {
	'packages/a/package.json': manifest({ dependencies: { x: '1.0.0' } }),
	'packages/a/.npmignore': 'src\ngenerator/\n',
	'packages/a/src/index.ts': 'one',
	'packages/a/README.md': 'readme',
	'packages/private/package.json': JSON.stringify({ name: 'private', private: true }),
	'packages/private/lib/index.js': 'one',
	'yarn.lock': 'one',
};

const line = { major: 1, role: 'lts', branch: 'branch' };

describe('checkLine', () => {
	test('counts a dependency and a source change of a public package, from the commit that landed it', () => {
		const git = repository({
			tag: base,
			history: [
				{
					sha: 'docs',
					time: 90 * DAY,
					subject: 'docs: readme',
					files: { ...base, 'packages/a/README.md': 'two' },
				},
				{
					sha: 'fix',
					time: 95 * DAY,
					subject: 'fix(a): bug',
					files: { ...base, 'packages/a/README.md': 'two', 'packages/a/src/index.ts': 'two' },
				},
				{
					sha: 'deps',
					time: 98 * DAY,
					subject: 'chore(deps): update x [security]',
					files: {
						...base,
						'packages/a/README.md': 'two',
						'packages/a/src/index.ts': 'two',
						'packages/a/package.json': manifest({ dependencies: { x: '1.0.1' } }),
					},
				},
			],
		});
		const report = checkLine(git, line, NOW);
		expect(report.baseline).toBe('v1.0.0');
		expect(report.packages).toStrictEqual([
			{ name: '@scope/a', changes: ['package.json#dependencies.x', 'src/index.ts'] },
		]);
		expect(report.carriers.map(commit => commit.sha)).toStrictEqual(['fix', 'deps']);
		expect(report.securityFixes.map(commit => commit.sha)).toStrictEqual(['deps']);
		expect(report.due).toBe(true);
	});

	test('is not due before three days have passed since the change landed', () => {
		const git = repository({
			tag: base,
			history: [
				{
					sha: 'fix',
					time: (NOW - DUE_AFTER_MS) / 1000 + 60,
					subject: 'fix(a): bug',
					files: { ...base, 'packages/a/src/index.ts': 'two' },
				},
			],
		});
		const report = checkLine(git, line, NOW);
		expect(report.packages).toHaveLength(1);
		expect(report.due).toBe(false);
	});

	test('ignores changes that npm users do not install', () => {
		const files = {
			...base,
			'packages/a/README.md': 'two',
			'packages/a/src/index.spec.ts': 'spec',
			'packages/a/generator/build.ts': 'two',
			'packages/a/package.json': manifest({ dependencies: { x: '1.0.0' }, devDependencies: { y: '2.0.0' } }),
			'packages/private/lib/index.js': 'two',
			'yarn.lock': 'two',
		};
		const git = repository({ tag: base, history: [{ sha: 'chore', time: 1, subject: 'chore: tooling', files }] });
		const report = checkLine(git, line, NOW);
		expect(report.packages).toStrictEqual([]);
		expect(report.due).toBe(false);
	});

	test('does not start the clock at the merge that brings a release back', () => {
		// The tag already has the bumped version and the sibling pin; the merge-back commit changes
		// them relative to the branch, but the cumulative diff from the tag does not hold them.
		const tag = {
			...base,
			'packages/a/package.json': manifest({
				version: '1.0.1',
				dependencies: { x: '1.0.0', '@scope/b': '1.0.1' },
			}),
		};
		const before = {
			...base,
			'packages/a/package.json': manifest({ dependencies: { x: '1.0.0', '@scope/b': '1.0.0' } }),
		};
		const git = repository({
			tag,
			history: [
				{ sha: 'unrelated', time: 10 * DAY, subject: 'chore: before', files: before },
				{ sha: 'merge-back', time: 20 * DAY, subject: "Merge 'origin/main' into dev", files: tag },
				{
					sha: 'fix',
					time: 99 * DAY,
					subject: 'fix(a): bug',
					files: { ...tag, 'packages/a/src/index.ts': 'two' },
				},
			],
		});
		const report = checkLine(git, line, NOW);
		expect(report.carriers.map(commit => commit.sha)).toStrictEqual(['fix']);
		expect(report.due).toBe(false);
	});

	test('reports nothing for a line without a release', () => {
		const git = repository({ tag: base, history: [] });
		expect(checkLine(git, { ...line, major: 2 }, NOW)).toMatchObject({ baseline: null, packages: [], due: false });
	});
});

describe('renderIssue', () => {
	test('starts with the marker of the line and lists the vulnerability fixes first', () => {
		const git = repository({
			tag: base,
			history: [
				{
					sha: 'deps000000',
					time: 90 * DAY,
					subject: 'chore(deps): update x [security] (#1)',
					files: { ...base, 'packages/a/package.json': manifest({ dependencies: { x: '1.0.1' } }) },
				},
			],
		});
		const { title, body } = renderIssue(checkLine(git, line, NOW), 'owner/repo', 'v1');
		expect(title).toBe('Release v1: changes since v1.0.0 are not published');
		expect(body.startsWith(`${marker(1)}\n`)).toBe(true);
		expect(body).toContain('https://github.com/owner/repo/compare/v1.0.0...v1');
		expect(body.indexOf('### Vulnerability fixes')).toBeLessThan(body.indexOf('### Changed packages'));
		expect(body).toContain('deps00000 1970-04-01 chore(deps): update x [security] (#1)');
		expect(body).toContain('a maintenance release on `v1` itself');
	});
});
