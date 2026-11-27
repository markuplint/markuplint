import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-dt-001] a dl in the content of a template is checked', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><dl><dt>name1</dt><dd>d1</dd><dt>name1</dt><dd>d2</dd></dl></template>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 40,
			raw: '<dt>',
			message: 'The name duplicated',
		},
	]);
});

test('[no-duplicate-dt-002] Duplicate in content', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`
<dl>
  <dt>name1</dt>
  <dd>description1</dd>
  <dt>name1</dt>
  <dd>description2</dd>
</dl>
`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'warning',
			line: 5,
			col: 3,
			raw: '<dt>',
			message: 'The name duplicated',
		},
	]);
});

test('[no-duplicate-dt-003] Duplicate with <div>', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`
<dl>
  <div>
    <dt>name1</dt>
    <dd>description1</dd>
  </div>
  <div>
    <dt>name1</dt>
    <dd>description2</dd>
  </div>
</dl>
`,
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'warning',
			line: 8,
			col: 5,
			raw: '<dt>',
			message: 'The name duplicated',
		},
	]);
});

test('[no-duplicate-dt-004] Nested', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				`
<dl>
  <div>
    <dt>name1</dt>
    <dd>description1</dd>
  </div>
  <dd>
    <dl>
      <dt>name1</dt>
      <dd>description2</dd>
    </dl>
  </dd>
</dl>
`,
			)
		).violations,
	).toStrictEqual([]);
});

test('[no-duplicate-dt-005] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<dl><dt>a</dt><dt>a</dt><dd></dd></dl>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 15,
			message: '名前が重複しています',
			raw: '<dt>',
		},
	]);
});

test('[no-duplicate-dt-006] a name is compared as its characters, with the character references decoded', async () => {
	const { violations } = await mlRuleTest(rule, '<dl><dt>a&amp;b</dt><dd>x</dd><dt>a&b</dt><dd>y</dd></dl>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 31,
			message: 'The name duplicated',
			raw: '<dt>',
		},
	]);
});

test('[no-duplicate-dt-007] a no-break space is a character of the name, not white space around it', async () => {
	const { violations } = await mlRuleTest(rule, '<dl><dt>&nbsp;a</dt><dd>x</dd><dt>a</dt><dd>y</dd></dl>');
	expect(violations).toStrictEqual([]);
});
