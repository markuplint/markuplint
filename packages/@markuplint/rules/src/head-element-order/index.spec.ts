import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('correct order: no violations', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta charset="UTF-8"><title>Title</title><link rel="stylesheet" href="style.css"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title', 'link'],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('wrong order: title before meta[charset]', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title', 'link'],
				},
			},
		);
		expect(violations).toHaveLength(2);
	});

	test('empty head: no violations', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head><body></body></html>', {
			rule: {
				value: ['meta[charset]', 'title'],
			},
		});
		expect(violations).toHaveLength(0);
	});

	test('no head: no violations', async () => {
		const { violations } = await mlRuleTest(rule, '<html><body></body></html>', {
			rule: {
				value: ['meta[charset]', 'title'],
			},
		});
		expect(violations).toHaveLength(0);
	});

	test('single child: no violations', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><title>Title</title></head><body></body></html>', {
			rule: {
				value: ['meta[charset]', 'title'],
			},
		});
		expect(violations).toHaveLength(0);
	});

	test('unmatched elements go to the end', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta charset="UTF-8"><title>Title</title><base href="/"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('unmatched element before matched: violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><base href="/"><meta charset="UTF-8"><title>Title</title></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
		);
		expect(violations).toHaveLength(3);
	});

	test('same group preserves source order', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><link rel="stylesheet" href="a.css"><link rel="stylesheet" href="b.css"></head><body></body></html>',
			{
				rule: {
					value: ['link'],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('selector conflict: more specific selector wins by position', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'meta'],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('selector conflict: meta[charset] matched before meta', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta name="viewport" content="width=device-width"><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'meta'],
				},
			},
		);
		expect(violations).toHaveLength(2);
	});

	test('custom order setting', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['title', 'meta[charset]'],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('severity setting', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					severity: 'error',
					value: ['meta[charset]', 'title'],
				},
			},
		);
		expect(violations).toHaveLength(2);
		expect(violations[0]!.severity).toBe('error');
		expect(violations[0]!.message).toBe('The "meta" element must be before the "title" element');
	});
});

describe('default value', () => {
	test('correct order with default value', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width"><title>Title</title><meta name="description" content="Desc"><link rel="stylesheet" href="style.css"></head><body></body></html>',
		);
		expect(violations).toHaveLength(0);
	});

	test('wrong order with default value', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
		);
		expect(violations.length).toBeGreaterThan(0);
	});
});

describe('selector conflict', () => {
	test('link[rel="stylesheet"] and link: specific selector wins', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><link rel="stylesheet" href="a.css"><link rel="icon" href="favicon.ico"></head><body></body></html>',
			{
				rule: {
					value: ['link[rel="stylesheet"]', 'link'],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('link[rel="stylesheet"] and link: wrong order', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><link rel="icon" href="favicon.ico"><link rel="stylesheet" href="a.css"></head><body></body></html>',
			{
				rule: {
					value: ['link[rel="stylesheet"]', 'link'],
				},
			},
		);
		expect(violations).toHaveLength(2);
	});

	test('object entry and string entry coexistence', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta name="author" content="Test"><meta name="description" content="Desc"><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', { selector: 'meta', order: 'alphabetical', attr: 'name' }],
				},
			},
		);
		expect(violations).toHaveLength(3);
	});

	test('elements matching no selector go to the end', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta charset="UTF-8"><title>Title</title><base href="/"><noscript>No JS</noscript></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});
});

describe('alphabetical sort', () => {
	test('correct alphabetical order', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta name="author" content="Test"><meta name="description" content="Desc"><meta name="viewport" content="width=device-width"></head><body></body></html>',
			{
				rule: {
					value: [{ selector: 'meta', order: 'alphabetical', attr: 'name' }],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('wrong alphabetical order', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta name="viewport" content="width=device-width"><meta name="author" content="Test"><meta name="description" content="Desc"></head><body></body></html>',
			{
				rule: {
					value: [{ selector: 'meta', order: 'alphabetical', attr: 'name' }],
				},
			},
		);
		expect(violations).toHaveLength(3);
	});

	test('elements without attr come first', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta charset="UTF-8"><meta name="author" content="Test"><meta name="description" content="Desc"></head><body></body></html>',
			{
				rule: {
					value: [{ selector: 'meta', order: 'alphabetical', attr: 'name' }],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('stable sort: same attr value preserves source order', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta name="author" content="Alice"><meta name="author" content="Bob"></head><body></body></html>',
			{
				rule: {
					value: [{ selector: 'meta', order: 'alphabetical', attr: 'name' }],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});

	test('alphabetical without attr: falls back to source order', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta name="b"><meta name="a"></head><body></body></html>',
			{
				rule: {
					value: [{ selector: 'meta', order: 'alphabetical' }],
				},
			},
		);
		expect(violations).toHaveLength(0);
	});
});

describe('i18n', () => {
	test('English message', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
		);
		expect(violations[0]!.message).toBe('The "meta" element should be before the "title" element');
	});

	test('Japanese message', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
			false,
			'ja',
		);
		expect(violations[0]!.message).toBe('要素「meta」は要素「title」より前にしたほうがよいです');
	});
});

describe('fix', () => {
	test('basic swap: title and meta[charset]', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
			true,
		);
		expect(fixedCode).toBe('<html><head><meta charset="UTF-8"><title>Title</title></head><body></body></html>');
	});

	test('multiple elements reorder', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<html><head><script src="app.js"></script><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title', 'script'],
				},
			},
			true,
		);
		expect(fixedCode).toBe(
			'<html><head><meta charset="UTF-8"><title>Title</title><script src="app.js"></script></head><body></body></html>',
		);
	});

	test('preserve indentation', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			`<html>
<head>
	<title>Title</title>
	<meta charset="UTF-8">
</head>
<body></body>
</html>`,
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
			true,
		);
		expect(fixedCode).toBe(`<html>
<head>
	<meta charset="UTF-8">
	<title>Title</title>
</head>
<body></body>
</html>`);
	});

	test('alphabetical sort fix', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<html><head><meta name="viewport" content="width=device-width"><meta name="author" content="Test"><meta name="description" content="Desc"></head><body></body></html>',
			{
				rule: {
					value: [{ selector: 'meta', order: 'alphabetical', attr: 'name' }],
				},
			},
			true,
		);
		expect(fixedCode).toBe(
			'<html><head><meta name="author" content="Test"><meta name="description" content="Desc"><meta name="viewport" content="width=device-width"></head><body></body></html>',
		);
	});

	test('already correct order: no change', async () => {
		const source = '<html><head><meta charset="UTF-8"><title>Title</title></head><body></body></html>';
		const { fixedCode } = await mlRuleTest(
			rule,
			source,
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
			true,
		);
		expect(fixedCode).toBe(source);
	});

	test('reorder elements with child content (script/style)', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<html><head><script>console.log("hello")</script><meta charset="UTF-8"></head><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'script'],
				},
			},
			true,
		);
		expect(fixedCode).toBe(
			'<html><head><meta charset="UTF-8"><script>console.log("hello")</script></head><body></body></html>',
		);
	});

	test('fix: head without explicit close tag', async () => {
		const { fixedCode } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"><body></body></html>',
			{
				rule: {
					value: ['meta[charset]', 'title'],
				},
			},
			true,
		);
		expect(fixedCode).toBe('<html><head><meta charset="UTF-8"><title>Title</title><body></body></html>');
	});
});
