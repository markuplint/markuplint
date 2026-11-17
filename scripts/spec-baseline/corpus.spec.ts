import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { assertFullHistory, listRevisions, parseLog, readBlob, systemGit, uniqueByBlob } from './corpus.ts';

const ZERO = '0'.repeat(40);
const blob = (n: number) => (n + 16).toString(16).padStart(40, '0');
const commit = (n: number) => `c${n.toString(16).padStart(39, '0')}`;

const LOG = [
	`${commit(3)}\t2026-11-16T14:47:04+09:00`,
	'',
	`:100644 100644 ${blob(2)} ${blob(3)} M\tpackages/@markuplint/html-spec/index.json`,
	`${commit(2)}\t2024-01-01T00:00:00+09:00`,
	'',
	`:100644 100644 ${blob(1)} ${blob(2)} M\tpackages/@markuplint/html-spec/index.json`,
	`${commit(1)}\t2020-07-14T00:00:00+09:00`,
	'',
	`:100644 100644 ${blob(1)} ${blob(1)} R100\tpackages/@markuplint/html-ls/index.json\tpackages/@markuplint/html-spec/index.json`,
	`${commit(0)}\t2020-01-01T00:00:00+09:00`,
	'',
	`:000000 100644 ${ZERO} ${blob(0)} A\tpackages/@markuplint/html-ls/index.json`,
	'',
].join('\n');

describe('parseLog', () => {
	test('reads the commit, the date, the path at that commit and the blob', () => {
		const revisions = parseLog(LOG);
		expect(revisions).toHaveLength(4);
		expect(revisions[0]).toStrictEqual({
			commit: commit(3),
			date: '2026-11-16T14:47:04+09:00',
			path: 'packages/@markuplint/html-spec/index.json',
			blob: blob(3),
		});
	});

	test('takes the path after a rename, which is where the blob is at that commit', () => {
		const renamed = parseLog(LOG).find(revision => revision.commit === commit(1));
		expect(renamed?.path).toBe('packages/@markuplint/html-spec/index.json');
	});

	test('skips a commit that deletes the file', () => {
		const deleted = [
			`${commit(5)}\t2025-01-01T00:00:00+09:00`,
			'',
			`:100644 000000 ${blob(4)} ${ZERO} D\tpackages/@markuplint/html-spec/index.json`,
			'',
		].join('\n');
		expect(parseLog(deleted)).toStrictEqual([]);
	});

	test('returns nothing for an empty log', () => {
		expect(parseLog('')).toStrictEqual([]);
	});
});

describe('uniqueByBlob', () => {
	test('keeps every blob of a history in which no content repeats, newest first', () => {
		const unique = uniqueByBlob(parseLog(LOG));
		expect(unique.map(entry => entry.blob)).toStrictEqual([blob(3), blob(2), blob(1), blob(0)]);
		expect(unique.map(entry => entry.commits)).toStrictEqual([1, 1, 1, 1]);
	});

	test('counts a blob that returns to an earlier content once', () => {
		const revisions = [
			{ commit: commit(3), date: 'd3', path: 'p', blob: blob(1) },
			{ commit: commit(2), date: 'd2', path: 'p', blob: blob(2) },
			{ commit: commit(1), date: 'd1', path: 'p', blob: blob(1) },
		];
		const unique = uniqueByBlob(revisions);
		expect(unique).toHaveLength(2);
		expect(unique[0]).toMatchObject({ blob: blob(1), commit: commit(3), commits: 2 });
	});
});

describe('listRevisions', () => {
	test('asks git for the history of the file with its renames, from the given ref', () => {
		const calls: string[][] = [];
		const revisions = listRevisions(
			args => {
				calls.push([...args]);
				return LOG;
			},
			'origin/dev',
			'packages/@markuplint/html-spec/index.json',
		);
		expect(revisions).toHaveLength(4);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toContain('--follow');
		expect(calls[0]).toContain('origin/dev');
		expect(calls[0]?.at(-1)).toBe('packages/@markuplint/html-spec/index.json');
	});
});

describe('assertFullHistory', () => {
	test('passes when the repository is not shallow', () => {
		expect(() => assertFullHistory(() => 'false\n')).not.toThrow();
	});

	test('throws a message that names the fix when the repository is shallow', () => {
		expect(() => assertFullHistory(() => 'true\n')).toThrow(/git fetch --unshallow/);
	});
});

describe('git of the machine', () => {
	const git = systemGit(fileURLToPath(new URL('../..', import.meta.url)));

	test('gives the revisions of a file in the format that parseLog reads, newest first', () => {
		const revisions = listRevisions(git, 'HEAD', 'package.json');
		expect(revisions.length).toBeGreaterThan(0);
		for (const revision of revisions) {
			expect(revision.commit).toMatch(/^[\da-f]{40}$/);
			expect(revision.blob).toMatch(/^[\da-f]{40}$/);
			expect(revision.path).toBe('package.json');
			expect(Number.isNaN(Date.parse(revision.date))).toBe(false);
		}
		const dates = revisions.map(revision => Date.parse(revision.date));
		expect(dates).toStrictEqual(dates.toSorted((a, b) => b - a));
	});

	test('reads a blob as the bytes that git stores', () => {
		const [newest] = listRevisions(git, 'HEAD', 'package.json');
		const bytes = readBlob(git, newest?.blob ?? '');
		expect(Buffer.isBuffer(bytes)).toBe(true);
		expect((JSON.parse(bytes.toString('utf8')) as { name?: string }).name).toBeTypeOf('string');
	});

	test('reads a blob that is not text without changing a byte', () => {
		expect(readBlob(() => Buffer.from([255, 254, 0]), 'x').equals(Buffer.from([255, 254, 0]))).toBe(true);
		expect(readBlob(() => 'abc', 'x').toString()).toBe('abc');
	});
});
