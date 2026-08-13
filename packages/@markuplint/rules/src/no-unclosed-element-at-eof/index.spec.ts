import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-unclosed-element-at-eof-invalid-001] picture left open at the end of the file', async () => {
	expect((await mlRuleTest(rule, '<picture><img src="x" alt="">')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<picture>',
			message: 'The "picture" element is not closed at the end of the file',
		},
	]);
});

test('[no-unclosed-element-at-eof-invalid-002] nested elements both left open at the end of the file', async () => {
	expect((await mlRuleTest(rule, '<section><div>text')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<section>',
			message: 'The "section" element is not closed at the end of the file',
		},
		{
			severity: 'error',
			line: 1,
			col: 10,
			raw: '<div>',
			message: 'The "div" element is not closed at the end of the file',
		},
	]);
});

test('[no-unclosed-element-at-eof-valid-001] properly closed picture', async () => {
	expect((await mlRuleTest(rule, '<picture><img src="x" alt=""></picture>')).violations).toStrictEqual([]);
});

test('[no-unclosed-element-at-eof-valid-002] optional-tag-omission elements left open at EOF are exempt', async () => {
	// `</ul>` implicitly closes the still-open `<li>` (generate implied end tags);
	// only elements outside the exempt list must have an explicit end tag.
	expect((await mlRuleTest(rule, '<ul><li>one<li>two</ul>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<li>orphan list item')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<p>last paragraph')).violations).toStrictEqual([]);
});

test('[no-unclosed-element-at-eof-valid-003] void elements are never flagged', async () => {
	expect((await mlRuleTest(rule, '<img src="x" alt="">')).violations).toStrictEqual([]);
});

test('[no-unclosed-element-at-eof-valid-004] an element autoclosed mid-document by a sibling is not an EOF case', async () => {
	expect((await mlRuleTest(rule, '<p>one<div>two</div>')).violations).toStrictEqual([]);
});
