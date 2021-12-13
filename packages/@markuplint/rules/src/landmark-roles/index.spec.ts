import { mlRuleTest } from 'markuplint';

import rule from './';

test('No warning', async () => {
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
		{ rule: true },
	);

	expect(violations).toStrictEqual([]);
});

test('Top level landmarks', async () => {
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
		{ rule: true },
	);

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 9,
			col: 3,
			raw: '<aside>',
			message: 'The "complementary" role should be top level',
		},
	]);
});

test('Top level landmarks: disabled', async () => {
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
			rule: true,

			nodeRule: [
				{
					tagName: 'aside',
					rule: false,
				},
			],
		},
	);

	expect(violations).toStrictEqual([]);
});

test('Top level landmarks: ignoreRoles option', async () => {
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
				option: {
					ignoreRoles: ['complementary'],
				},
			},
		},
	);

	expect(violations).toStrictEqual([]);
});

test('Duplicated area: has-label', async () => {
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
		{
			rule: {
				option: {
					ignoreRoles: ['complementary'],
				},
			},
		},
	);

	expect(violations).toStrictEqual([]);
});

test('Duplicated area: no-label', async () => {
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
		{
			rule: {
				option: {
					ignoreRoles: ['complementary'],
				},
			},
		},
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
