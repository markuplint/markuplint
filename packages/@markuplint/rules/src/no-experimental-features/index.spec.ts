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
