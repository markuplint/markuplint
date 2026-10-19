import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('experimental elements/attributes', () => {
	test('[no-experimental-features-invalid-001] warns about experimental attributes', async () => {
		// "credentialless" on <iframe> is experimental in spec data
		const { violations } = await mlRuleTest(rule, '<iframe credentialless></iframe>', {
			rule: true,
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('experimental');
		expect(violations[0]?.message).toContain('"credentialless"');
	});
});

describe('ignoreFeatures', () => {
	test('[no-experimental-features-valid-001] ignore attribute by pattern', async () => {
		const { violations } = await mlRuleTest(rule, '<iframe credentialless></iframe>', {
			rule: {
				options: {
					ignoreFeatures: ['iframe[credentialless]'],
				},
			},
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('default severity', () => {
	test('[no-experimental-features-invalid-002] severity is warning by default', async () => {
		const { violations } = await mlRuleTest(rule, '<iframe credentialless></iframe>', {
			rule: true,
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
	});
});

describe('pretender gap (issue #3740)', () => {
	test('[no-experimental-features-issue-3740-001] web-component pretendered to experimental HTML reports', async () => {
		const { violations } = await mlRuleTest(rule, '<x-iframe credentialless></x-iframe>', {
			pretenders: [{ selector: 'x-iframe', as: { element: 'iframe', inheritAttrs: true } }],
			rule: true,
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.severity).toBe('warning');
		expect(violations[0]?.message).toContain('"credentialless"');
		expect(violations[0]?.message).toContain('experimental');
		expect(violations[0]?.raw).toBe('credentialless');
	});
});

describe('attribute name case (issue #4309)', () => {
	test('[no-experimental-features-issue-4309-001] HTML: an attribute written in upper case is the experimental one', async () => {
		const { violations } = await mlRuleTest(rule, '<iframe CREDENTIALLESS></iframe>', { rule: true });
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'CREDENTIALLESS',
				message: 'The "CREDENTIALLESS" attribute is experimental',
			},
		]);
	});

	test('[no-experimental-features-issue-4309-002] HTML: ignoreFeatures keys match in any spelling', async () => {
		const attrUpper = await mlRuleTest(rule, '<iframe credentialless></iframe>', {
			rule: { options: { ignoreFeatures: ['iframe[CREDENTIALLESS]'] } },
		});
		expect(attrUpper.violations).toStrictEqual([]);
		const elementUpper = await mlRuleTest(rule, '<iframe credentialless></iframe>', {
			rule: { options: { ignoreFeatures: ['IFRAME[credentialless]'] } },
		});
		expect(elementUpper.violations).toStrictEqual([]);
		const sourceUpper = await mlRuleTest(rule, '<IFRAME CREDENTIALLESS></IFRAME>', {
			rule: { options: { ignoreFeatures: ['iframe[credentialless]'] } },
		});
		expect(sourceUpper.violations).toStrictEqual([]);
		const control = await mlRuleTest(rule, '<iframe CREDENTIALLESS></iframe>', {
			rule: { options: { ignoreFeatures: ['iframe[other]'] } },
		});
		expect(control.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'CREDENTIALLESS',
				message: 'The "CREDENTIALLESS" attribute is experimental',
			},
		]);
	});

	test('[no-experimental-features-issue-4309-003] HTML: the ignoreFeatures of an element replaces that of the rule, each element keeping its own', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<iframe class="a" CREDENTIALLESS></iframe><iframe class="b" CREDENTIALLESS></iframe><iframe class="c" CREDENTIALLESS></iframe>',
			{
				rule: { options: { ignoreFeatures: ['iframe[credentialless]'] } },
				nodeRule: [
					{
						selector: '.b',
						rule: { options: { ignoreFeatures: [] } },
					},
					{
						selector: '.c',
						rule: { options: { ignoreFeatures: ['IFRAME[Credentialless]'] } },
					},
				],
			},
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 61,
				raw: 'CREDENTIALLESS',
				message: 'The "CREDENTIALLESS" attribute is experimental',
			},
		]);
	});

	test('[no-experimental-features-issue-4309-004] Svelte: the element part is exact and the attribute part folds', async () => {
		const parser = { '.*': '@markuplint/svelte-parser' };
		const elementUpper = await mlRuleTest(rule, '<iframe CREDENTIALLESS></iframe>', {
			parser,
			rule: { options: { ignoreFeatures: ['IFRAME[credentialless]'] } },
		});
		expect(elementUpper.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'CREDENTIALLESS',
				message: 'The "CREDENTIALLESS" attribute is experimental',
			},
		]);
		const attrUpper = await mlRuleTest(rule, '<iframe CREDENTIALLESS></iframe>', {
			parser,
			rule: { options: { ignoreFeatures: ['iframe[Credentialless]'] } },
		});
		expect(attrUpper.violations).toStrictEqual([]);
	});

	test('[no-experimental-features-issue-4309-005] JSX: an HTML element folds the attribute names', async () => {
		const parser = { '.*': '@markuplint/jsx-parser' };
		const reported = await mlRuleTest(rule, '<iframe CREDENTIALLESS />', { parser, rule: true });
		expect(reported.violations).toStrictEqual([
			{
				severity: 'warning',
				line: 1,
				col: 9,
				raw: 'CREDENTIALLESS',
				message: 'The "CREDENTIALLESS" attribute is experimental',
			},
		]);
		const ignored = await mlRuleTest(rule, '<iframe CREDENTIALLESS />', {
			parser,
			rule: { options: { ignoreFeatures: ['iframe[credentialless]'] } },
		});
		expect(ignored.violations).toStrictEqual([]);
	});
});
