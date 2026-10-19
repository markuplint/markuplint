import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-hardcoded-id-invalid-001] is hard-coded', async () => {
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

test("[no-hardcoded-id-valid-001] does't have id", async () => {
	const { violations } = await mlRuleTest(rule, '<div class="foo"></div>');
	expect(violations).toStrictEqual([]);
});

test("[no-hardcoded-id-valid-002] does't have id", async () => {
	const { violations } = await mlRuleTest(rule, '<div data-id="foo"></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-hardcoded-id-invalid-002] is hard-coded', async () => {
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

test('[no-hardcoded-id-invalid-003] is hard-coded', async () => {
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

test('[no-hardcoded-id-invalid-004] is hard-coded', async () => {
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

test('[no-hardcoded-id-valid-003] is no hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, 'div(id=foo)', {
		parser: {
			'/.*/': '@markuplint/pug-parser',
		},
	});
	expect(violations.length).toBe(0);
});

test('[no-hardcoded-id-valid-004] is no hard-coded', async () => {
	const { violations } = await mlRuleTest(rule, '<div id={foo}></div>', {
		parser: {
			'/.*/': '@markuplint/jsx-parser',
		},
	});
	expect(violations.length).toBe(0);
});

test('[no-hardcoded-id-valid-005] is no fragment', async () => {
	const { violations } = await mlRuleTest(rule, '<html><body><div id="foo"></div></body></html>');
	expect(violations.length).toBe(0);
});

test('[no-hardcoded-id-issue-4309-001] an upper-case name is the id in HTML', async () => {
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

test('[no-hardcoded-id-issue-4309-002] an HTML element in JSX folds the name, an SVG element does not', async () => {
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
