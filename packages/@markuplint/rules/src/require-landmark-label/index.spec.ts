import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-landmark-label-001] Duplicated area: has-label', async () => {
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

test('[require-landmark-label-002] a landmark in the content of a template is not counted with the ones of the document', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<html><body><nav></nav><template><nav></nav></template></body></html>',
	);
	expect(violations).toStrictEqual([]);
});

test('[require-landmark-label-003] the landmarks in the content of a template are counted by themselves', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<html><body><template><nav></nav><nav></nav></template></body></html>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 23,
			message: 'Require unique accessible name',
			raw: '<nav>',
		},
		{
			severity: 'warning',
			line: 1,
			col: 34,
			message: 'Require unique accessible name',
			raw: '<nav>',
		},
	]);
});

test('[require-landmark-label-004] the landmarks in a declarative shadow root are counted by themselves', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<html><body><nav></nav><div><template shadowrootmode="open"><nav></nav><nav></nav></template></div></body></html>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 61,
			message: 'Require unique accessible name',
			raw: '<nav>',
		},
		{
			severity: 'warning',
			line: 1,
			col: 72,
			message: 'Require unique accessible name',
			raw: '<nav>',
		},
	]);
});

test('[require-landmark-label-005] the landmarks in a template in a template are counted by themselves', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<html><body><template><nav></nav><template><nav></nav><nav></nav></template></template></body></html>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 44,
			message: 'Require unique accessible name',
			raw: '<nav>',
		},
		{
			severity: 'warning',
			line: 1,
			col: 55,
			message: 'Require unique accessible name',
			raw: '<nav>',
		},
	]);
});

test('[require-landmark-label-006] a single banner with an explicit role is not duplicated', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><header role="banner"></header></body></html>');
	expect(violations).toStrictEqual([]);
});

test('[require-landmark-label-007] a single contentinfo with an explicit role is not duplicated', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><footer role="contentinfo"></footer></body></html>');
	expect(violations).toStrictEqual([]);
});

test('[require-landmark-label-008] Duplicated area: no-label', async () => {
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
