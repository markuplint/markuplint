import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

const message =
	'The "pattern" attribute expects regular expression (https://html.spec.whatwg.org/multipage/input.html#compiled-pattern-regular-expression)';

const verify = async (value: string, prefix = '') =>
	(await mlRuleTest(rule, `<input ${prefix}pattern="${value}">`)).violations;

const reported = (raw: string, col = 17) => [{ severity: 'error', line: 1, col, message, raw }];

test('[no-invalid-attr-value-issue-4651-001] `[(]` is not compiled with the `v` flag', async () => {
	expect(await verify('[(]')).toStrictEqual(reported('[(]'));
});

test('[no-invalid-attr-value-issue-4651-002] `a{` is not compiled with the `v` flag', async () => {
	expect(await verify('a{')).toStrictEqual(reported('a{'));
});

test('[no-invalid-attr-value-issue-4651-003] `{` is not compiled with the `v` flag', async () => {
	expect(await verify('{')).toStrictEqual(reported('{'));
});

test('[no-invalid-attr-value-issue-4651-004] an escaped hyphen outside a class is not compiled with the `v` flag', async () => {
	expect(await verify(String.raw`\-`)).toStrictEqual(reported(String.raw`\-`));
});

test('[no-invalid-attr-value-issue-4651-005] a trailing hyphen in a class is not compiled with the `v` flag', async () => {
	expect(await verify('[a-]')).toStrictEqual(reported('[a-]'));
});

test('[no-invalid-attr-value-issue-4651-006] a trailing hyphen after a class escape is not compiled with the `v` flag', async () => {
	expect(await verify(String.raw`[\w.-]+`)).toStrictEqual(reported(String.raw`[\w.-]+`));
});

test('[no-invalid-attr-value-issue-4651-007] a negated class of a lone hyphen is not compiled with the `v` flag', async () => {
	expect(await verify('[^-]')).toStrictEqual(reported('[^-]'));
});

test('[no-invalid-attr-value-issue-4651-008] a reserved double punctuator in a class is not compiled with the `v` flag', async () => {
	expect(await verify('[a-z&&[aeiou]]')).toStrictEqual(reported('[a-z&&[aeiou]]'));
});

test('[no-invalid-attr-value-issue-4651-009] a value with an unmatched parenthesis is reported although wrapping balances it', async () => {
	expect(await verify('a)|(b')).toStrictEqual(reported('a)|(b'));
});

test('[no-invalid-attr-value-issue-4651-010] the violation points at the value after another attribute', async () => {
	expect(await verify('[(]', 'type="text" ')).toStrictEqual(reported('[(]', 29));
});

test('[no-invalid-attr-value-issue-4651-011] set subtraction in a class is compiled with the `v` flag', async () => {
	expect(await verify(String.raw`[\p{L}--[a-z]]`)).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-4651-012] set intersection in a class is compiled with the `v` flag', async () => {
	expect(await verify(String.raw`[\p{L}&&\p{ASCII}]`)).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-4651-013] a string literal in a class is compiled with the `v` flag', async () => {
	expect(await verify(String.raw`[\q{abc}]`)).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-4651-014] a trailing escaped hyphen in a class is accepted', async () => {
	expect(await verify(String.raw`[\w.\-]+`)).toStrictEqual([]);
});

test('[no-invalid-attr-value-issue-4651-015] a plain pattern is accepted', async () => {
	expect(await verify(String.raw`\d{3}-\d{4}`)).toStrictEqual([]);
});
