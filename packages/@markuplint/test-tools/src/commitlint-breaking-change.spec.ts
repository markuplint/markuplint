import { existsSync } from 'node:fs';
import path from 'node:path';

import { execa } from 'execa';
import { describe, test, expect } from 'vitest';

import { noBreakingChangeOnStableLine } from '../../../../.commitlintrc.js';

/**
 * Guards the commitlint rule that keeps a breaking-change marker out of the
 * stable line (the `git` skill, Commit message format). `yarn release` runs
 * `lerna version --conventional-commits` on a fixed-version workspace, so one
 * commit with a `!` after the type or a `BREAKING CHANGE:` footer since the
 * last tag turns the next release of the stable line into a major, the number
 * the next-major line owns. The rule tells the lines apart by
 * `crates/Cargo.toml`, the tracked file of the directory the root `CLAUDE.md`
 * names. The factory is exercised directly for both lines; the real
 * `commitlint` CLI is run for the marker forms so that the parser's mapping of
 * a `!` header and a footer to a breaking note, which the rule relies on, is
 * checked where this repository's config is loaded — with the outcome this
 * checkout's line calls for, so the same spec holds on `dev` and on `v6`.
 */

const rootDir = path.resolve(import.meta.dirname, '../../../..');

const breakingNote = { title: 'BREAKING CHANGE', text: 'the output changes' };

describe('noBreakingChangeOnStableLine', () => {
	test('rejects a breaking note on the stable line and says why and what to write instead', () => {
		const rule = noBreakingChangeOnStableLine(() => true);

		const [valid, message] = rule({ notes: [breakingNote] });

		expect(valid).toBe(false);
		expect(message).toContain('yarn release');
		expect(message).toContain('Behavior change (experimental):');
		expect(message).toContain('v6');
	});

	test('rejects a commit with more than one note alike', () => {
		const rule = noBreakingChangeOnStableLine(() => true);

		expect(rule({ notes: [breakingNote, { title: 'BREAKING CHANGE', text: 'and the input' }] })[0]).toBe(false);
	});

	test('accepts a commit without a breaking note on the stable line', () => {
		const rule = noBreakingChangeOnStableLine(() => true);

		expect(rule({ notes: [] })).toStrictEqual([true]);
	});

	test('accepts a breaking note on the next-major line', () => {
		const rule = noBreakingChangeOnStableLine(() => false);

		expect(rule({ notes: [breakingNote] })).toStrictEqual([true]);
	});
});

// The CLI is a Node program spawned as a child process: the bun and deno runs of
// this suite cover the rule through the factory cases above.
const isNode = !('bun' in process.versions) && !('deno' in process.versions);

describe.skipIf(!isNode)('commitlint with the repository config', () => {
	const stableLine = !existsSync(path.join(rootDir, 'crates', 'Cargo.toml'));
	const cli = path.join(rootDir, 'node_modules', '@commitlint', 'cli', 'cli.js');

	function lint(message: string) {
		return execa(process.execPath, [cli], { cwd: rootDir, input: message, reject: false });
	}

	test.each([
		['a `!` after the type', 'fix(pretenders)!: change the output\n'],
		['a `BREAKING CHANGE:` footer', 'fix(pretenders): change the output\n\nBREAKING CHANGE: the output changes\n'],
		['a `BREAKING-CHANGE:` footer', 'fix(pretenders): change the output\n\nBREAKING-CHANGE: the output changes\n'],
	])('rejects %s on the stable line and accepts it on the next-major line', async (_, message) => {
		const result = await lint(message);
		const output = `${result.stdout}\n${result.stderr}`;

		if (stableLine) {
			expect(result.exitCode).toBe(1);
			expect(output).toContain('[no-breaking-change-on-stable-line]');
			expect(output).toContain('Describe the change in a `Behavior change (experimental): …` paragraph');
		} else {
			expect(result.exitCode).toBe(0);
			expect(output).not.toContain('no-breaking-change-on-stable-line');
		}
	});

	test('accepts the behavior-change paragraph on either line', async () => {
		const result = await lint(
			'fix(pretenders): change the output\n\nBehavior change (experimental): the output is now the other thing.\n',
		);

		expect(result.exitCode).toBe(0);
	});
});
