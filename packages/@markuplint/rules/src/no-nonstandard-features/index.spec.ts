import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('non-standard elements/attributes', () => {
	test('[no-nonstandard-features-invalid-001] warns about non-standard attributes', async () => {
		// "moz-opaque" on canvas is nonStandard in spec data
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: true,
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('"moz-opaque"');
		expect(violations[0]?.message).toContain('non-standard');
	});
});

describe('ignoreFeatures', () => {
	test('[no-nonstandard-features-valid-001] ignore attribute by pattern', async () => {
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: {
				options: {
					ignoreFeatures: ['canvas[moz-opaque]'],
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('default severity', () => {
	test('[no-nonstandard-features-invalid-002] severity is warning by default', async () => {
		const { violations } = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: true,
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
	});
});

describe('attribute name case', () => {
	const message = 'The "MOZ-OPAQUE" attribute is non-standard';

	test('[no-nonstandard-features-issue-4309-001] HTML: an attribute written in upper case is the non-standard one', async () => {
		const { violations } = await mlRuleTest(rule, '<canvas MOZ-OPAQUE></canvas>', { rule: true });
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
	});

	test('[no-nonstandard-features-issue-4309-002] HTML: ignoreFeatures keys match in any spelling', async () => {
		const attrUpper = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: { options: { ignoreFeatures: ['canvas[MOZ-OPAQUE]'] } },
		});
		expect(attrUpper.violations).toStrictEqual([]);
		const elementUpper = await mlRuleTest(rule, '<canvas moz-opaque></canvas>', {
			rule: { options: { ignoreFeatures: ['CANVAS[moz-opaque]'] } },
		});
		expect(elementUpper.violations).toStrictEqual([]);
		const sourceUpper = await mlRuleTest(rule, '<CANVAS MOZ-OPAQUE></CANVAS>', {
			rule: { options: { ignoreFeatures: ['canvas[moz-opaque]'] } },
		});
		expect(sourceUpper.violations).toStrictEqual([]);
		const control = await mlRuleTest(rule, '<canvas MOZ-OPAQUE></canvas>', {
			rule: { options: { ignoreFeatures: ['canvas[other]'] } },
		});
		expect(control.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
	});

	test('[no-nonstandard-features-issue-4309-003] HTML: the ignoreFeatures of an element replaces that of the rule, each element keeping its own', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<canvas class="a" MOZ-OPAQUE></canvas><canvas class="b" MOZ-OPAQUE></canvas><canvas class="c" MOZ-OPAQUE></canvas>',
			{
				rule: { options: { ignoreFeatures: ['canvas[moz-opaque]'] } },
				nodeRule: [
					{
						selector: '.b',
						rule: { options: { ignoreFeatures: [] } },
					},
					{
						selector: '.c',
						rule: { options: { ignoreFeatures: ['CANVAS[Moz-Opaque]'] } },
					},
				],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 57,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
	});

	test('[no-nonstandard-features-issue-4309-004] Svelte: the element part is exact and the attribute part folds', async () => {
		const parser = { '.*': '@markuplint/svelte-parser' };
		const elementUpper = await mlRuleTest(rule, '<canvas MOZ-OPAQUE></canvas>', {
			parser,
			rule: { options: { ignoreFeatures: ['CANVAS[moz-opaque]'] } },
		});
		expect(elementUpper.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
		const attrUpper = await mlRuleTest(rule, '<canvas MOZ-OPAQUE></canvas>', {
			parser,
			rule: { options: { ignoreFeatures: ['canvas[Moz-Opaque]'] } },
		});
		expect(attrUpper.violations).toStrictEqual([]);
	});

	test('[no-nonstandard-features-issue-4309-005] JSX: an HTML element folds the attribute names', async () => {
		const parser = { '.*': '@markuplint/jsx-parser' };
		const reported = await mlRuleTest(rule, '<canvas MOZ-OPAQUE />', { parser, rule: true });
		expect(reported.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'MOZ-OPAQUE',
				message,
			},
		]);
		const ignored = await mlRuleTest(rule, '<canvas MOZ-OPAQUE />', {
			parser,
			rule: { options: { ignoreFeatures: ['canvas[moz-opaque]'] } },
		});
		expect(ignored.violations).toStrictEqual([]);
	});
});
