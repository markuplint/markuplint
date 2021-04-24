import rule from './';
import { testAsyncAndSyncVerify } from '../test-utils';

test('No warning', async () => {
	await testAsyncAndSyncVerify(
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
});

test('Top level landmarks', async () => {
	await testAsyncAndSyncVerify(
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
		[
			{
				ruleId: 'landmark-roles',
				severity: 'warning',
				line: 9,
				col: 3,
				raw: '<aside>',
				message: 'complementary should be top level',
			},
		],
	);
});

test('Top level landmarks: disabled', async () => {
	await testAsyncAndSyncVerify(
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
});

test('Top level landmarks: ignoreRoles option', async () => {
	await testAsyncAndSyncVerify(
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
});

test('Duplicated area: has-label', async () => {
	await testAsyncAndSyncVerify(
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
});

test('Duplicated area: no-label', async () => {
	await testAsyncAndSyncVerify(
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
		[
			{
				ruleId: 'landmark-roles',
				severity: 'warning',
				line: 5,
				col: 2,
				raw: '<nav>',
				message: 'Should have a unique label because navigation landmarks were markup more than once on a page',
			},
			{
				ruleId: 'landmark-roles',
				severity: 'warning',
				line: 8,
				col: 3,
				raw: '<nav>',
				message: 'Should have a unique label because navigation landmarks were markup more than once on a page',
			},
		],
	);
});
