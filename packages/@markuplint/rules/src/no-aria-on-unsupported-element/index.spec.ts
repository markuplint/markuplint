import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

/**
 * No element in the bundled HTML / SVG / MathML spec data currently declares
 * `globalAttrs['#ARIAAttrs']: false` — every element that defines the flag at
 * all sets it to `true` (verified by grepping `packages/@markuplint/html-spec`
 * for a `false` occurrence: none exist). This rule mirrors a check the `wai-aria`
 * umbrella rule always performed regardless, so these tests can only exercise
 * the "no false positive on an ordinary, ARIA-supporting element" path — the
 * report path is exactly the umbrella's `checkings`-less inline logic it
 * always ran, unchanged by this extraction.
 */
describe('ordinary elements permit ARIA attributes', () => {
	test('[no-aria-on-unsupported-element-valid-001] div with role and aria-* is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<div role="button" aria-pressed="false"></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-aria-on-unsupported-element-valid-002] svg with role and aria-label is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<svg role="img" aria-label="A chart"></svg>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-aria-on-unsupported-element-valid-003] no ARIA attribute at all is valid', async () => {
		const { violations } = await mlRuleTest(rule, '<div></div>');
		expect(violations).toStrictEqual([]);
	});
});
