import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('Duplicate in content', async () => {
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
			severity: 'error',
			line: 5,
			col: 3,
			raw: '<dt>',
			message: 'The name duplicated',
		},
	]);
});

test('Duplicate with <div>', async () => {
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
			severity: 'error',
			line: 8,
			col: 5,
			raw: '<dt>',
			message: 'The name duplicated',
		},
	]);
});

test('Nested', async () => {
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
