/**
 * The IDs that tie a Rust test to the TypeScript test it ports.
 *
 * `[rule-name-NNN]` is the number of a behavior, given by `packages/@markuplint/rules/CLAUDE.md` and unique within
 * the rule. A Rust test names it three ways: the `const _ID` of its body, the function name, and the
 * `/// TS: \`[id]\`` comment above it (`crates/markuplint-rules/CLAUDE.md`). When the TypeScript side renumbers, a
 * reference that is not followed names no test, or another one, and nothing else says so: the Rust test still
 * passes. This checks that every ID that a Rust test names is the ID of a TypeScript test, and that the three
 * agree.
 *
 * What it does not see: that the Rust test asserts what the TypeScript test asserts (`yarn test:rust-rules` runs the
 * TypeScript specs against the Rust engine for that), and a pull request that changes only the TypeScript specs, which
 * the plan of `yarn test:affected` does not take to affect this file: the merge queue runs the whole suite.
 *
 * @module
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

import { describe, expect, test } from 'vitest';

/** The tracked files under the path that are on the disk: one that is deleted and not staged yet is not read. */
const listFiles = (pathspec: string) =>
	execFileSync('git', ['ls-files', pathspec], { encoding: 'utf8' })
		.split('\n')
		.filter(file => file && fs.existsSync(file));

/** The IDs of the tests of the rules' specs. */
const tsIds = new Set(
	listFiles('packages/@markuplint/rules/src')
		.filter(file => file.endsWith('.spec.ts'))
		.flatMap(file => [...fs.readFileSync(file, 'utf8').matchAll(/\[([a-z][a-z0-9-]*-\d{3,4})\]/g)].map(m => m[1]!)),
);

type RustTest = {
	readonly location: string;
	readonly id: string;
	readonly fn: string | undefined;
	/** The IDs of the `TS:` comments directly above the test. */
	readonly cited: readonly string[];
};

/** The Rust tests that name an ID with `const _ID`. */
const rustTests: readonly RustTest[] = listFiles('crates')
	.filter(file => file.endsWith('.rs'))
	.flatMap(file => {
		const lines = fs.readFileSync(file, 'utf8').split('\n');
		return lines.flatMap((line, index): RustTest[] => {
			const id = /const _ID: &str = "([^"]+)";/.exec(line)?.[1];
			if (!id) {
				return [];
			}
			// The function that holds `_ID` is the nearest `fn` above it, and the attributes and the comments are above that
			let fnLine = index - 1;
			while (fnLine >= 0 && !/^\s*(?:pub(?:\([a-z]+\))? )?fn [a-z0-9_]+\(/.test(lines[fnLine]!)) {
				fnLine--;
			}
			const cited: string[] = [];
			for (let above = fnLine - 1; above >= 0 && /^\s*(?:#\[|\/\/)/.test(lines[above]!); above--) {
				const comment = /TS:? `\[([a-z0-9-]+)\]`/.exec(lines[above]!)?.[1];
				if (comment) {
					cited.push(comment);
				}
			}
			return [
				{
					location: `${file}:${index + 1}`,
					id,
					fn: /fn ([a-z0-9_]+)\(/.exec(lines[fnLine] ?? '')?.[1],
					cited,
				},
			];
		});
	});

describe('the Rust tests that port a TypeScript test', () => {
	test('are found', () => {
		// A change of how the tests are written must not leave this with nothing to check
		expect(rustTests.length).toBeGreaterThan(500);
		expect(tsIds.size).toBeGreaterThan(500);
	});

	test('name the ID of a TypeScript test by `_ID`', () => {
		expect(rustTests.filter(t => !tsIds.has(t.id)).map(t => `${t.location} ${t.id}`)).toStrictEqual([]);
	});

	test('name an ID once', () => {
		const seen = new Set<string>();
		const repeated = rustTests.filter(t => (seen.has(t.id) ? true : !seen.add(t.id))).map(t => t.location);
		expect(repeated).toStrictEqual([]);
	});

	test('are named by the ID with underscores', () => {
		expect(
			rustTests.filter(t => t.fn !== t.id.replaceAll('-', '_')).map(t => `${t.location} ${t.fn} for ${t.id}`),
		).toStrictEqual([]);
	});

	test('cite the same ID in the `TS:` comment above them', () => {
		expect(
			rustTests.filter(t => t.cited.some(id => id !== t.id)).map(t => `${t.location} ${t.id} cites ${t.cited}`),
		).toStrictEqual([]);
	});
});

describe('the IDs that a Rust comment cites as a TypeScript test', () => {
	test('are IDs of TypeScript tests', () => {
		const dangling = listFiles('crates')
			.filter(file => file.endsWith('.rs'))
			.flatMap(file =>
				fs
					.readFileSync(file, 'utf8')
					.split('\n')
					.flatMap((line, index) =>
						[...line.matchAll(/TS:? `\[([a-z][a-z0-9-]*-\d{3,4})\]`/g)]
							.filter(m => !tsIds.has(m[1]!))
							.map(m => `${file}:${index + 1} ${m[1]}`),
					),
			);
		expect(dangling).toStrictEqual([]);
	});
});
