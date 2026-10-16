import type { MLMLSpec } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';
import debug from 'debug';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { convertRuleset } from './convert-ruleset.js';
import { MLCore } from './ml-core.js';
import { MLRule } from './ml-rule/index.js';

/**
 * Reports two overlapping fixes on the number in `<p>0</p>`, so the multi-pass loop applies one, skips the
 * other and finds a larger number on the next pass. It never converges, so the loop hits its pass cap.
 */
const neverConvergingRule = new MLRule({
	name: 'never-converging',
	defaultValue: null,
	defaultOptions: null,
	verify(context) {
		const match = /<p>(\d+)<\/p>/.exec(context.document.raw);
		if (!match?.[1]) {
			return;
		}
		const start = match.index + '<p>'.length;
		const range = [start, start + match[1].length] as const;
		const next = Number(match[1]) + 1;
		context.report({
			message: 'Increment',
			line: 1,
			col: start + 1,
			raw: match[1],
			fix: fixer => fixer.replaceRange(range, String(next)),
		});
		context.report({
			message: 'Increment by two',
			line: 1,
			col: start + 1,
			raw: match[1],
			fix: fixer => fixer.replaceRange(range, String(next + 1)),
		});
	},
});

/** Switches debug on while `verify()` is running, after that run has already read the flag on entry. */
const enablingRule = new MLRule({
	name: 'enabling',
	defaultValue: null,
	defaultOptions: null,
	verify() {
		debug.enable('ml-core*');
	},
});

function createCore(rule = neverConvergingRule, name = 'never-converging') {
	return new MLCore({
		parser,
		sourceCode: '<p>0</p>',
		ruleset: convertRuleset({ rules: { [name]: true } }),
		rules: [rule],
		locale: { locale: 'en' },
		schemas: [spec as unknown as MLMLSpec, {}],
		ruleCommonSettings: {},
		parserOptions: {},
		severity: {},
		pretenders: [],
		filename: 'test.html',
	});
}

function written(write: { mock: { calls: unknown[][] } }) {
	return write.mock.calls.map(([chunk]) => String(chunk)).join('');
}

describe('MLCore#multiPassFix debug logging', () => {
	afterEach(() => {
		debug.disable();
		vi.restoreAllMocks();
	});

	test('reaches the pass cap and writes no log while the logger is disabled', async () => {
		debug.disable();
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

		const { fixSummary } = await createCore().verify(true);

		expect(fixSummary?.reachedMaxPasses).toBe(true);
		expect(write).not.toHaveBeenCalled();
	});

	test('still logs the pass cap message once the logger is enabled after import', async () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.enable('ml-core*');

		const { fixSummary } = await createCore().verify(true);

		expect(fixSummary?.reachedMaxPasses).toBe(true);
		expect(written(write)).toContain(
			'fix: reached maximum number of passes (10), some fixes may not have been applied',
		);
	});

	test('a run that read the flag as off stays silent after a mid-run enable, and the next run follows it', async () => {
		const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
		debug.disable();

		await createCore(enablingRule, 'enabling').verify();

		expect(written(write)).not.toContain('verify: start');
		expect(written(write)).not.toContain('verify: end');
		write.mockClear();

		await createCore(enablingRule, 'enabling').verify();

		expect(written(write)).toContain('verify: start');
		expect(written(write)).toContain('verify: end');
	});
});
