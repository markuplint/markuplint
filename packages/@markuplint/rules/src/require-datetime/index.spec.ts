import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[require-datetime-valid-001] Valid', async () => {
	expect((await mlRuleTest(rule, '<time>2000-01-01</time>')).violations).toStrictEqual([]);
	expect((await mlRuleTest(rule, '<time datetime="2000-01-01">2000/01/01</time>')).violations).toStrictEqual([]);
});

test('[require-datetime-invalid-001] Mutable', async () => {
	expect(
		(
			await mlRuleTest(rule, '<time>{foo}</time>', {
				parser: {
					'.*': '@markuplint/jsx-parser',
				},
			})
		).violations,
	).toStrictEqual([]);
});

test('[require-datetime-invalid-002] Need', async () => {
	expect((await mlRuleTest(rule, '<time>Content</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need the "datetime" attribute',
		},
	]);
});

test('[require-datetime-invalid-003] Candidates', async () => {
	expect((await mlRuleTest(rule, '<time>2000/01/01</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need datetime="2000-01-01"',
		},
	]);

	expect((await mlRuleTest(rule, '<time>令和5年1月3日</time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<time>',
			message: 'Need datetime="2023-01-03"',
		},
	]);
});

test('[require-datetime-invalid-004] The `as` attribute', async () => {
	expect((await mlRuleTest(rule, '<x-time as="time">2000/01/01</x-time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<x-time as="time">',
			message: 'Need datetime="2000-01-01"',
		},
	]);

	expect((await mlRuleTest(rule, '<x-time as="time">令和5年1月3日</x-time>')).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 1,
			raw: '<x-time as="time">',
			message: 'Need datetime="2023-01-03"',
		},
	]);
});
