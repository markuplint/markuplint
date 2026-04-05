import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-interaction-in-hidden-valid-001] no aria-hidden', async () => {
	expect((await mlRuleTest(rule, '<button>click</button>')).violations).toStrictEqual([]);
});

test('[wai-aria-interaction-in-hidden-valid-002] non-interactive in hidden', async () => {
	expect((await mlRuleTest(rule, '<div aria-hidden="true"><span>text</span></div>')).violations).toStrictEqual([]);
});

test('[wai-aria-interaction-in-hidden-invalid-001] focusable in hidden', async () => {
	const { violations } = await mlRuleTest(rule, '<div aria-hidden="true"><button>click</button></div>');
	expect(violations.length).toBe(1);
	expect(violations[0]!.severity).toBe('warning');
});
