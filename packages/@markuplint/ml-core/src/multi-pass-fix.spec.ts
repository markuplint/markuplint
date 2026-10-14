import type { MultiPassFixHost } from './multi-pass-fix.js';
import type { FixData, Violation } from '@markuplint/ml-config';

import { describe, test, expect } from 'vitest';

import { multiPassFix } from './multi-pass-fix.js';

function violation(fix?: FixData): Violation {
	return { ruleId: 'test-rule', severity: 'error', message: 'm', line: 1, col: 1, raw: '', ...(fix && { fix }) };
}

function replace(start: number, end: number, text: string): FixData {
	return { edits: [{ range: [start, end], text }] };
}

/**
 * A host over a table: the violations each code has, and the codes that cannot be parsed.
 * `loads` and `lints` record what the loop asked for.
 */
function host(violationsOf: (code: string) => readonly Violation[], unparsable: readonly string[] = []) {
	const loads: string[] = [];
	let lints = 0;
	let loaded = '';
	const result: MultiPassFixHost = {
		load: code => {
			loads.push(code);
			loaded = code;
			return Promise.resolve(!unparsable.includes(code));
		},
		lint: () => {
			lints++;
			return Promise.resolve(violationsOf(loaded));
		},
	};
	return { host: result, loads, lints: () => lints };
}

describe('multiPassFix', () => {
	test('without fixes it changes nothing and loads nothing', async () => {
		const h = host(() => []);
		const { code, summary } = await multiPassFix('abc', [violation()], h.host);
		expect(code).toBe('abc');
		expect(summary).toStrictEqual({
			passCount: 1,
			totalApplied: 0,
			totalSkipped: 0,
			reachedMaxPasses: false,
			firstPassEdits: [],
			finalPassViolations: undefined,
		});
		expect(h.loads).toStrictEqual([]);
		expect(h.lints()).toBe(0);
	});

	test('applies independent fixes in one pass and lints the result once', async () => {
		const remaining = violation();
		const h = host(() => [remaining]);
		const { code, summary } = await multiPassFix(
			'abcdef',
			[violation(replace(0, 1, 'X')), violation(replace(4, 5, 'Y'))],
			h.host,
		);
		expect(code).toBe('XbcdYf');
		expect(summary.passCount).toBe(1);
		expect(summary.totalApplied).toBe(2);
		expect(summary.totalSkipped).toBe(0);
		expect(summary.firstPassEdits).toStrictEqual([
			{ range: [0, 1], text: 'X' },
			{ range: [4, 5], text: 'Y' },
		]);
		expect(summary.finalPassViolations).toStrictEqual([remaining]);
		expect(h.loads).toStrictEqual(['XbcdYf']);
		expect(h.lints()).toBe(1);
	});

	test('re-lints the output and applies what overlapped, in a second pass', async () => {
		// The first fix takes `abc`, so the overlapping second one waits for the next pass.
		const h = host(code => (code === 'Xd' ? [violation(replace(1, 2, 'Z'))] : []));
		const { code, summary } = await multiPassFix(
			'abcd',
			[violation(replace(0, 3, 'X')), violation(replace(1, 2, 'Y'))],
			h.host,
		);
		expect(code).toBe('XZ');
		expect(summary.passCount).toBe(2);
		expect(summary.totalApplied).toBe(2);
		expect(summary.totalSkipped).toBe(1);
		expect(summary.firstPassEdits).toStrictEqual([{ range: [0, 3], text: 'X' }]);
		expect(h.loads).toStrictEqual(['Xd', 'XZ']);
	});

	test('keeps the previous parsable code when a pass produces one that cannot be parsed', async () => {
		const h = host(() => [], ['broken']);
		const { code, summary } = await multiPassFix('ok', [violation(replace(0, 2, 'broken'))], h.host);
		expect(code).toBe('ok');
		expect(summary.totalApplied).toBe(0);
		expect(summary.firstPassEdits).toStrictEqual([]);
		expect(summary.finalPassViolations).toBeUndefined();
		// The unparsable code was the last one loaded, so nothing is linted for it.
		expect(h.lints()).toBe(0);
	});

	test('stops when fixes undo each other', async () => {
		const flip = (code: string) => violation(replace(0, 1, code === 'a' ? 'b' : 'a'));
		// Both fixes touch the same range, so one is skipped and the loop re-lints.
		const h = host(code => [flip(code)]);
		const { code, summary } = await multiPassFix(
			'a',
			[violation(replace(0, 1, 'b')), violation(replace(0, 1, 'c'))],
			h.host,
		);
		// `a` → `b` → `a` is a cycle: the second output repeats the input of the first pass.
		expect(code).toBe('a');
		expect(summary.reachedMaxPasses).toBe(false);
		expect(summary.passCount).toBe(2);
	});

	test('stops at the pass limit', async () => {
		// Every pass appends a character and leaves a skipped fix behind, so it never settles.
		const grow = (code: string) => [
			violation(replace(code.length, code.length, 'x')),
			violation(replace(code.length, code.length + 1, 'y')),
		];
		const h = host(grow);
		const { summary } = await multiPassFix('', grow(''), h.host);
		expect(summary.reachedMaxPasses).toBe(true);
		expect(summary.passCount).toBe(10);
	});
});
