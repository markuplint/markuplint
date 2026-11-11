import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-redundant-accessible-name-issue-4538-001] the nodes that a slot of a shadow root takes are the content that aria-label overrides', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<div role="button" aria-label="X"><template shadowrootmode="open"><slot></slot></template>Save</div>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 1,
			raw: '<div role="button" aria-label="X">',
			message: 'The accessible name from "aria-label" overrides "content"',
		},
	]);
});

test('[no-redundant-accessible-name-issue-4538-002] a slot that is not in a shadow root may render anything, so the element is not reported', async () => {
	const { violations } = await mlRuleTest(rule, '<div role="button" aria-label="X"><slot></slot></div>');
	expect(violations).toStrictEqual([]);
});
