import { describe, it, expect } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * Regression guard for the rule-alias wiring added in `MLEngine#resolveConfig`
 * (v5 rule-system redesign, #3989).
 */
describe('rule aliasing', () => {
	it('a config using only current rule names produces no rule-alias deprecation notices', async () => {
		const { violations } = await mlTest('<div id="a"></div><div id="a"></div>', {
			rules: {
				'no-duplicate-id': true,
			},
		});
		const deprecationNotices = violations.filter(v => v.ruleId === 'rule-deprecation');
		expect(deprecationNotices).toStrictEqual([]);
		expect(violations.some(v => v.ruleId === 'no-duplicate-id')).toBe(true);
	});

	it('a deprecated rule name still runs its check under the replacement name, plus a deprecation notice', async () => {
		const { violations } = await mlTest('<div id="a"></div><div id="a"></div>', {
			rules: {
				'id-duplication': true,
			},
		});
		const deprecationNotice = violations.find(v => v.ruleId === 'rule-deprecation');
		expect(deprecationNotice).toStrictEqual({
			ruleId: 'rule-deprecation',
			severity: 'warning',
			message: 'Rule "id-duplication" is deprecated and will be removed in v6. Use no-duplicate-id instead.',
			col: 1,
			line: 1,
			raw: '',
		});
		// The check itself still ran, reported under the replacement's rule ID.
		expect(violations.some(v => v.ruleId === 'no-duplicate-id')).toBe(true);
		expect(violations.some(v => v.ruleId === 'id-duplication')).toBe(false);
	});

	it('severity.deprecation "off" suppresses the notice; a genuine config-error is unaffected', async () => {
		const { violations } = await mlTest('<div id="a"></div><div id="a"></div>', {
			rules: {
				'id-duplication': true,
				'nonexistent-rule': true,
			},
			severity: { deprecation: 'off' },
		});
		expect(violations.some(v => v.ruleId === 'rule-deprecation')).toBe(false);
		expect(
			violations.some(v => v.ruleId === 'config-error' && v.message === 'Rule not found: nonexistent-rule'),
		).toBe(true);
	});

	it('severity.deprecation "error" escalates the notice', async () => {
		const { violations } = await mlTest('<div id="a"></div><div id="a"></div>', {
			rules: {
				'id-duplication': true,
			},
			severity: { deprecation: 'error' },
		});
		const deprecationNotice = violations.find(v => v.ruleId === 'rule-deprecation');
		expect(deprecationNotice?.severity).toBe('error');
	});

	it('a deprecated boolean rule name disabled with `false` stays disabled under the replacement', async () => {
		const { violations } = await mlTest('<div id="a"></div><div id="a"></div>', {
			rules: {
				'id-duplication': false,
			},
		});
		expect(violations.some(v => v.ruleId === 'no-duplicate-id')).toBe(false);
	});
});
