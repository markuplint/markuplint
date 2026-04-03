import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('verify', () => {
	test('[head-element-order-valid-001] correct order: no violations', async () => {
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

	test('[head-element-order-invalid-001] wrong order: title before meta[charset]', async () => {
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

	test('[head-element-order-valid-002] empty head: no violations', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head><body></body></html>', {
			rule: {
				value: ['meta[charset]', 'title'],
			},
		});
		expect(violations).toHaveLength(0);
	});

	test('[head-element-order-valid-003] no head: no violations', async () => {
		const { violations } = await mlRuleTest(rule, '<html><body></body></html>', {
			rule: {
				value: ['meta[charset]', 'title'],
			},
		});
		expect(violations).toHaveLength(0);
	});

	test('[head-element-order-valid-004] single child: no violations', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><title>Title</title></head><body></body></html>', {
			rule: {
				value: ['meta[charset]', 'title'],
			},
		});
		expect(violations).toHaveLength(0);
	});

	test('[head-element-order-valid-005] unmatched elements go to the end', async () => {
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

	test('[head-element-order-invalid-002] unmatched element before matched: violation', async () => {
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

	test('[head-element-order-valid-006] same group preserves source order', async () => {
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

	test('[head-element-order-valid-007] selector conflict: more specific selector wins by position', async () => {
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

	test('[head-element-order-invalid-003] selector conflict: meta[charset] matched before meta', async () => {
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

	test('[head-element-order-valid-008] custom order setting', async () => {
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

	test('[head-element-order-invalid-004] severity setting', async () => {
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
	test('[head-element-order-valid-009] correct order with default value', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width"><title>Title</title><meta name="description" content="Desc"><link rel="stylesheet" href="style.css"></head><body></body></html>',
		);
		expect(violations).toHaveLength(0);
	});

	test('[head-element-order-invalid-005] wrong order with default value', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><head><title>Title</title><meta charset="UTF-8"></head><body></body></html>',
		);
		expect(violations.length).toBeGreaterThan(0);
	});
});

describe('selector conflict', () => {
	test('[head-element-order-valid-010] link[rel="stylesheet"] and link: specific selector wins', async () => {
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

	test('[head-element-order-invalid-006] link[rel="stylesheet"] and link: wrong order', async () => {
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

	test('[head-element-order-invalid-007] object entry and string entry coexistence', async () => {
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

	test('[head-element-order-valid-011] elements matching no selector go to the end', async () => {
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
	test('[head-element-order-valid-012] correct alphabetical order', async () => {
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

	test('[head-element-order-invalid-008] wrong alphabetical order', async () => {
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

	test('[head-element-order-valid-013] elements without attr come first', async () => {
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

	test('[head-element-order-valid-014] stable sort: same attr value preserves source order', async () => {
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

	test('[head-element-order-valid-015] alphabetical without attr: falls back to source order', async () => {
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
	test('[head-element-order-invalid-009] English message', async () => {
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

	test('[head-element-order-invalid-010] Japanese message', async () => {
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
	test('[head-element-order-fix-001] basic swap: title and meta[charset]', async () => {
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

	test('[head-element-order-fix-002] multiple elements reorder', async () => {
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

	test('[head-element-order-fix-003] preserve indentation', async () => {
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

	test('[head-element-order-fix-004] alphabetical sort fix', async () => {
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

	test('[head-element-order-fix-005] already correct order: no change', async () => {
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

	test('[head-element-order-fix-006] reorder elements with child content (script/style)', async () => {
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

	test('[head-element-order-fix-007] fix: head without explicit close tag', async () => {
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
