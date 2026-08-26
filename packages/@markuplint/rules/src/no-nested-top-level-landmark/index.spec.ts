import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-nested-top-level-landmark-valid-001] No warning', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<html>
<body>
	<header></header>
	<nav></nav>
	<main>
		<header></header>
		<footer></footer>
	</main>
	<aside></aside>
	<footer></footer>
</body>
</html>
`,
	);

	expect(violations).toStrictEqual([]);
});

test('[no-nested-top-level-landmark-valid-002] Top level landmarks', async () => {
	// `complementary` is deliberately not one of this rule's checked top-level roles (see the
	// module JSDoc), so a nested `<aside>` here is not reported.
	const { violations } = await mlRuleTest(
		rule,
		`
<html>
<body>
	<header></header>
	<nav></nav>
	<main>
		<header></header>
		<footer></footer>
		<aside></aside>
	</main>
	<footer></footer>
</body>
</html>
`,
	);

	expect(violations).toStrictEqual([]);
});

test('[no-nested-top-level-landmark-valid-003] Top level landmarks: disabled', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<html>
<body>
	<header></header>
	<nav></nav>
	<main>
		<header></header>
		<footer></footer>
		<aside></aside>
	</main>
	<footer></footer>
</body>
</html>
`,
		{
			nodeRule: [
				{
					selector: 'aside',
					rule: false,
				},
			],
		},
	);

	expect(violations).toStrictEqual([]);
});

test('[no-nested-top-level-landmark-valid-004] Top level landmarks: ignoreRoles option', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<html>
<body>
	<header></header>
	<nav></nav>
	<main>
		<header></header>
		<footer></footer>
		<aside></aside>
	</main>
	<footer></footer>
</body>
</html>
`,
		{
			rule: {
				options: {
					ignoreRoles: ['complementary'],
				},
			},
		},
	);

	expect(violations).toStrictEqual([]);
});

test('[no-nested-top-level-landmark-invalid-001] nested main is flagged', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`
<html>
<body>
	<header></header>
	<nav></nav>
	<main>
		<header></header>
		<footer></footer>
		<main></main>
	</main>
</body>
</html>
`,
	);

	expect(violations.length).toBeGreaterThanOrEqual(1);
});

test('[no-nested-top-level-landmark-valid-005] The `as` attribute', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`
<html>
<body>
	<main>
		<x-aside as="aside"></x-aside>
	</main>
</body>
</html>
`,
			)
		).violations,
	).toStrictEqual([]);
});
