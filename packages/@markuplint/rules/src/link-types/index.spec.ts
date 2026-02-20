import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('Element context', () => {
	test('<link rel="stylesheet"> — allowed on link', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="stylesheet">');
		expect(violations.length).toBe(0);
	});

	test('<link rel="bookmark"> — not allowed on link', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="bookmark">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				raw: 'bookmark',
				message: 'The "bookmark" keyword is not allowed on the "link" element',
			},
		]);
	});

	test('<a rel="bookmark"> — allowed on a', async () => {
		const { violations } = await mlRuleTest(rule, '<a rel="bookmark">link</a>');
		expect(violations.length).toBe(0);
	});

	test('<a rel="canonical"> — not allowed on a', async () => {
		const { violations } = await mlRuleTest(rule, '<a rel="canonical">link</a>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				raw: 'canonical',
				message: 'The "canonical" keyword is not allowed on the "a" element',
			},
		]);
	});

	test('<form rel="nofollow"> — allowed on form', async () => {
		const { violations } = await mlRuleTest(rule, '<form rel="nofollow"></form>');
		expect(violations.length).toBe(0);
	});

	test('<form rel="stylesheet"> — not allowed on form', async () => {
		const { violations } = await mlRuleTest(rule, '<form rel="stylesheet"></form>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				raw: 'stylesheet',
				message: 'The "stylesheet" keyword is not allowed on the "form" element',
			},
		]);
	});

	test('<area rel="noopener"> — allowed on area', async () => {
		const { violations } = await mlRuleTest(rule, '<area rel="noopener">');
		expect(violations.length).toBe(0);
	});

	test('<area rel="canonical"> — not allowed on area (same as a)', async () => {
		const { violations } = await mlRuleTest(rule, '<area rel="canonical">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				raw: 'canonical',
				message: 'The "canonical" keyword is not allowed on the "a" element',
			},
		]);
	});
});

describe('Body-ok', () => {
	test('<link rel="canonical"> in head — allowed', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head><link rel="canonical"></head><body></body></html>');
		expect(violations.length).toBe(0);
	});

	test('<link rel="stylesheet"> in body — allowed (bodyOk=Yes)', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head><body><link rel="stylesheet"></body></html>');
		expect(violations.length).toBe(0);
	});

	test('<link rel="canonical"> in body — not allowed (not body-ok)', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head><body><link rel="canonical"></body></html>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 37,
				raw: 'canonical',
				message: 'The "canonical" keyword is not allowed on the "link" element inside the "body" element',
			},
		]);
	});

	test('<link rel="icon"> in body — not allowed (not body-ok)', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head><body><link rel="icon"></body></html>');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe(
			'The "icon" keyword is not allowed on the "link" element inside the "body" element',
		);
	});

	test('<link rel="bookmark"> in body — "not allowed on link" takes precedence over body-ok', async () => {
		const { violations } = await mlRuleTest(rule, '<html><head></head><body><link rel="bookmark"></body></html>');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('The "bookmark" keyword is not allowed on the "link" element');
	});
});

describe('Body-ok: fragment mode', () => {
	test('<link rel="canonical"> in fragment — allowed (no body-ok check)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="canonical">');
		expect(violations.length).toBe(0);
	});

	test('<link rel="stylesheet"> in fragment — allowed', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="stylesheet">');
		expect(violations.length).toBe(0);
	});
});

describe('Microformats control', () => {
	test('default: <link rel="apple-touch-icon"> — not allowed', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="apple-touch-icon">');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('The "apple-touch-icon" keyword is not allowed');
	});

	test('allowMicroformats: true — <link rel="apple-touch-icon"> — allowed', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="apple-touch-icon">', {
			rule: {
				options: { allowMicroformats: true },
			},
		});
		expect(violations.length).toBe(0);
	});

	test('allowMicroformats: true — <a rel="disclosure"> — allowed (a-ok microformat)', async () => {
		const { violations } = await mlRuleTest(rule, '<a rel="disclosure">link</a>', {
			rule: {
				options: { allowMicroformats: true },
			},
		});
		expect(violations.length).toBe(0);
	});

	test('allowMicroformats: true — <link rel="disclosure"> — not allowed (link not ok)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="disclosure">', {
			rule: {
				options: { allowMicroformats: true },
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('The "disclosure" keyword is not allowed on the "link" element');
	});

	test('allowMicroformats: true — <link rel="ikon"> — not allowed (unregistered)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="ikon">', {
			rule: {
				options: { allowMicroformats: true },
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('The "ikon" keyword is not allowed');
	});

	test('allowMicroformats: true — <form rel="apple-touch-icon"> — rejected (microformats not on form)', async () => {
		const { violations } = await mlRuleTest(rule, '<form rel="apple-touch-icon"></form>', {
			rule: {
				options: { allowMicroformats: true },
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('The "apple-touch-icon" keyword is not allowed on the "form" element');
	});

	test('allowMicroformats: ["apple-touch-icon"] — <link rel="apple-touch-icon"> — allowed', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="apple-touch-icon">', {
			rule: {
				options: { allowMicroformats: ['apple-touch-icon'] },
			},
		});
		expect(violations.length).toBe(0);
	});

	test('allowMicroformats: ["apple-touch-icon"] — <link rel="mask-icon"> — not allowed', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="mask-icon">', {
			rule: {
				options: { allowMicroformats: ['apple-touch-icon'] },
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('The "mask-icon" keyword is not allowed');
	});

	test('allowMicroformats: ["disclosure"] — <link rel="disclosure"> — rejected (link not ok)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="disclosure">', {
			rule: {
				options: { allowMicroformats: ['disclosure'] },
			},
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('The "disclosure" keyword is not allowed on the "link" element');
	});

	test('allowMicroformats: ["my-custom-rel"] — <link rel="my-custom-rel"> — allowed (custom keyword)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="my-custom-rel">', {
			rule: {
				options: { allowMicroformats: ['my-custom-rel'] },
			},
		});
		expect(violations.length).toBe(0);
	});
});

describe('Dropped/Rejected/Non-HTML', () => {
	test('<link rel="banner"> — dropped', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="banner">');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				raw: 'banner',
				message: '"banner" is dropped',
			},
		]);
	});

	test('<a rel="logo"> — rejected', async () => {
		const { violations } = await mlRuleTest(rule, '<a rel="logo">link</a>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				raw: 'logo',
				message: '"logo" is rejected',
			},
		]);
	});

	test('<link rel="first"> — dropped without prejudice', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="first">');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('"first" is dropped');
	});

	test('<link rel="self"> — non-HTML rel value', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="self">');
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe('"self" is not allowed');
	});
});

describe('Edge cases', () => {
	test('<div rel="whatever"> — skip (non-target element)', async () => {
		const { violations } = await mlRuleTest(rule, '<div rel="whatever"></div>');
		expect(violations.length).toBe(0);
	});

	test('<a rel="NoOpener"> — case-insensitive', async () => {
		const { violations } = await mlRuleTest(rule, '<a rel="NoOpener">link</a>');
		expect(violations.length).toBe(0);
	});

	test('<a rel="noopener noreferrer"> — multiple keywords OK', async () => {
		const { violations } = await mlRuleTest(rule, '<a rel="noopener noreferrer">link</a>');
		expect(violations.length).toBe(0);
	});

	test('<a rel="noopener foobar"> — one error for unknown keyword', async () => {
		const { violations } = await mlRuleTest(rule, '<a rel="noopener foobar">link</a>');
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('foobar');
		expect(violations[0]?.message).toBe('The "foobar" keyword is not allowed');
	});

	test('<link rel=""> — skip (empty)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="">');
		expect(violations.length).toBe(0);
	});

	test('<link rel="  "> — skip (whitespace only)', async () => {
		const { violations } = await mlRuleTest(rule, '<link rel="  ">');
		expect(violations.length).toBe(0);
	});
});
