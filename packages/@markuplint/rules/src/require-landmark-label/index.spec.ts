import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-landmark-label-valid-001] Duplicated area: has-label', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<html>
<body>
	<header></header>
	<nav aria-label="main"></nav>
	<main>
		<header></header>
		<nav aria-label="sub"></nav>
		<footer></footer>
	</main>
	<footer></footer>
</body>
</html>
`,
	);

	expect(violations).toStrictEqual([]);
});

test('[require-landmark-label-invalid-001] Duplicated area: no-label', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<html>
<body>
	<header></header>
	<nav></nav>
	<main>
		<header></header>
		<nav></nav>
		<footer></footer>
	</main>
	<footer></footer>
</body>
</html>
`,
	);

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 5,
			col: 2,
			raw: '<nav>',
			message: 'Require unique accessible name',
		},
		{
			severity: 'warning',
			line: 8,
			col: 3,
			raw: '<nav>',
			message: 'Require unique accessible name',
		},
	]);
});
