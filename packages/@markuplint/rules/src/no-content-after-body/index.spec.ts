import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-content-after-body-invalid-001] a start tag after the body end tag', async () => {
	expect(
		(await mlRuleTest(rule, '<!doctype html>\n<body>\n</body>\n<p>stray paragraph</p>\n')).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 4,
			col: 1,
			raw: '<p>',
			message: 'Content after the end tag of the "body" element is not allowed',
		},
	]);
});

test('[no-content-after-body-invalid-002] non-whitespace text after the body end tag', async () => {
	expect((await mlRuleTest(rule, '<!doctype html>\n<body></body>text\n')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 2,
			col: 14,
			raw: 'text\n',
			message: 'Content after the end tag of the "body" element is not allowed',
		},
	]);
});

test('[no-content-after-body-valid-001] trailing whitespace after the body end tag is allowed', async () => {
	expect((await mlRuleTest(rule, '<!doctype html>\n<body></body>\n\n')).violations).toStrictEqual([]);
});

test('[no-content-after-body-valid-002] no explicit body end tag', async () => {
	expect((await mlRuleTest(rule, '<!doctype html>\n<body><p>only paragraph</p>')).violations).toStrictEqual([]);
});

test('[no-content-after-body-valid-003] content nested inside the body element', async () => {
	expect((await mlRuleTest(rule, '<!doctype html>\n<body><p>inside body</p></body>')).violations).toStrictEqual([]);
});
