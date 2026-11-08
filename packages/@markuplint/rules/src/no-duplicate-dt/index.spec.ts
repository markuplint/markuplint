import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-dt-issue-4489-001] a dl in the content of a template is checked', async () => {
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

test('[no-duplicate-dt-invalid-001] Duplicate in content', async () => {
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

test('[no-duplicate-dt-invalid-002] Duplicate with <div>', async () => {
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

test('[no-duplicate-dt-invalid-003] Nested', async () => {
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
