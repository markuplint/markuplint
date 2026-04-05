import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[wai-aria-permitted-roles-valid-001] permitted role', async () => {
	expect((await mlRuleTest(rule, '<a href="path/to" role="button">text</a>')).violations).toStrictEqual([]);
});

test('[wai-aria-permitted-roles-invalid-001] non-permitted role on select', async () => {
	expect((await mlRuleTest(rule, '<select role="textbox"></select>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 15,
			message:
				'Cannot overwrite the "textbox" role to the "select" element according to ARIA in HTML specification',
			raw: 'textbox',
		},
	]);
});
