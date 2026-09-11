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
