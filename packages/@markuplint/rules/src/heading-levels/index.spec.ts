import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('No skipped', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<h1>...</h1>
<p>...</p>
<h2>...</h2>
<p>...</p>
<h3>...</h3>
<p>...</p>
<h2>...</h2>
<p>...</p>
<h3>...</h3>
<p>...</p>
<h4>...</h4>
<p>...</p>
<h2>...</h2>
<p>...</p>
`,
	);
	expect(violations.length).toBe(0);
});

test('Skipped', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<h1>...</h1>
<p>...</p>
<h2>...</h2>
<p>...</p>
<h4>...</h4>
<p>...</p>
<h2>...</h2>
<p>...</p>
<h5>...</h5>
<p>...</p>
`,
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 6,
			col: 1,
			message: 'Heading levels must not be skipped',
			raw: '<h4>',
		},
		{
			severity: 'error',
			line: 10,
			col: 1,
			message: 'Heading levels must not be skipped',
			raw: '<h5>',
		},
	]);
});
