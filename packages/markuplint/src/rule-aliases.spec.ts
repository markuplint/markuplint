import { describe, it, expect } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTest } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * Regression guard for the rule-alias wiring added in `MLEngine#resolveConfig`
 * (v5 rule-system redesign, #3989). `ruleAliasTable` is empty until the
 * rename/split commits populate it, so this only exercises the negative
 * path — the wiring must be a no-op today. Once the table has entries, add
 * the positive case here: a deprecated rule name still reports its check
 * under the replacement rule's name, plus a `config-error` deprecation
 * notice at `severity: 'warning'`.
 */
describe('rule aliasing (empty table)', () => {
	it('a config using only current rule names produces no rule-alias deprecation notices', async () => {
		const { violations } = await mlTest('<div id="a"></div><div id="a"></div>', {
			rules: {
				'id-duplication': true,
			},
		});
		const deprecationNotices = violations.filter(
			v => v.ruleId === 'config-error' && v.message.includes('is deprecated'),
		);
		expect(deprecationNotices).toStrictEqual([]);
		// The real (non-aliased) rule still ran.
		expect(violations.some(v => v.ruleId === 'id-duplication')).toBe(true);
	});
});
