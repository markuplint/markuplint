import * as markuplint from 'markuplint';
import rule from './';

test('No warning', async () => {
	const r = await markuplint.verify(
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
		{
			rules: {
				'landmark-roles': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([]);
});

test('Top level landmarks', async () => {
	const r = await markuplint.verify(
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
			rules: {
				'landmark-roles': true,
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'landmark-roles',
			severity: 'warning',
			line: 9,
			col: 3,
			raw: '<aside>',
			message: 'The complementary landmark should be top level landmarks',
		},
	]);
});

test('Top level landmarks: disabled', async () => {
	const r = await markuplint.verify(
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
			rules: {
				'landmark-roles': true,
			},
			nodeRules: [
				{
					tagName: 'aside',
					rules: {
						'landmark-roles': false,
					},
				},
			],
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([]);
});

test('Top level landmarks: ignoreRoles option', async () => {
	const r = await markuplint.verify(
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
			rules: {
				'landmark-roles': {
					option: {
						ignoreRoles: ['complementary'],
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([]);
});

test('Duplicated area: has-label', async () => {
	const r = await markuplint.verify(
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
			rules: {
				'landmark-roles': {
					option: {
						ignoreRoles: ['complementary'],
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([]);
});

test('Duplicated area: no-label', async () => {
	const r = await markuplint.verify(
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
			rules: {
				'landmark-roles': {
					option: {
						ignoreRoles: ['complementary'],
					},
				},
			},
		},
		[rule],
		'en',
	);

	expect(r).toStrictEqual([
		{
			ruleId: 'landmark-roles',
			severity: 'warning',
			line: 5,
			col: 2,
			raw: '<nav>',
			message: 'Should have a unique label because navigation landmark role is used more than once on a web page',
		},
		{
			ruleId: 'landmark-roles',
			severity: 'warning',
			line: 8,
			col: 3,
			raw: '<nav>',
			message: 'Should have a unique label because navigation landmark role is used more than once on a web page',
		},
	]);
});
