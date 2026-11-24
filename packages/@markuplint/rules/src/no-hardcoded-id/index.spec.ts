import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-hardcoded-id-001] is hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="foo"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'id="foo"',
			message: 'It is hard-coded',
		},
	]);
});

test("[no-hardcoded-id-002] does't have id", async () => {
	const { violations } = await mlRuleTest(rule, '<div class="foo"></div>');
	expect(violations).toStrictEqual([]);
});

test("[no-hardcoded-id-003] does't have id", async () => {
	const { violations } = await mlRuleTest(rule, '<div data-id="foo"></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-hardcoded-id-004] is hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, 'div#foo', {
		parser: {
			'/.*/': '@markuplint/pug-parser',
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 4,
			raw: '#foo',
			message: 'It is hard-coded',
		},
	]);
});

test('[no-hardcoded-id-005] is hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, 'div(id="foo")', {
		parser: {
			'/.*/': '@markuplint/pug-parser',
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 5,
			raw: 'id="foo"',
			message: 'It is hard-coded',
		},
	]);
});

test('[no-hardcoded-id-006] is hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="foo"></div>', {
		parser: {
			'.*': '@markuplint/jsx-parser',
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'id="foo"',
			message: 'It is hard-coded',
		},
	]);
});

test('[no-hardcoded-id-007] is no hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, 'div(id=foo)', {
		parser: {
			'/.*/': '@markuplint/pug-parser',
		},
	});
	expect(violations.length).toBe(0);
});

test('[no-hardcoded-id-008] is no hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, '<div id={foo}></div>', {
		parser: {
			'/.*/': '@markuplint/jsx-parser',
		},
	});
	expect(violations.length).toBe(0);
});

test('[no-hardcoded-id-009] is no fragment', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><div id="foo"></div></body></html>');
	expect(violations.length).toBe(0);
});

test('[no-hardcoded-id-010] an upper-case name is the id in HTML', async () => {
	const { violations } = await mlRuleTest(rule, '<div ID="foo"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'ID="foo"',
			message: 'It is hard-coded',
		},
	]);
});

test('[no-hardcoded-id-011] an HTML element in JSX folds the name, an SVG element does not', async () => {
	const options = { parser: { '.*': '@markuplint/jsx-parser' } };
	const html = await mlRuleTest(rule, '<div ID="foo" />', options);
	expect(html.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'ID="foo"',
			message: 'It is hard-coded',
		},
	]);
	const svgExact = await mlRuleTest(rule, '<svg id="foo" />', options);
	expect(svgExact.violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'id="foo"',
			message: 'It is hard-coded',
		},
	]);
	const svgUpper = await mlRuleTest(rule, '<svg ID="foo" />', options);
	expect(svgUpper.violations).toStrictEqual([]);
});
