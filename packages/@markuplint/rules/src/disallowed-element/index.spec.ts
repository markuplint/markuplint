import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[disallowed-element-invalid-001] specifies to global rule', async () => {
	const { violations } = await mlRuleTest(rule, '<div><hgroup><h1>Heading</h1></hgroup></div>', {
		rule: ['hgroup'],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 6,
			raw: '<hgroup>',
			message: 'The "hgroup" element is disallowed',
		},
	]);
});

test('[disallowed-element-invalid-002] specifies to node rule', async () => {
	const { violations } = await mlRuleTest(rule, '<h1><span>Title</span><small>Sub-title</small></h1>', {
		nodeRule: [
			{
				selector: 'h1, h2, h3, h4, h5, h6',
				rule: ['small'],
			},
		],
	});
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 23,
			raw: '<small>',
			message: 'The "small" element is disallowed',
		},
	]);
});

test('[disallowed-element-invalid-003] Recommend', async () => {
	expect(
		(
			await mlRuleTest(
				rule,
				'<details><summary><label id="foo">foo</label></summary><input id="foo"/></details>',
				{
					nodeRule: [
						{
							selector: 'summary',
							rule: ['label'],
						},
					],
				},
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			raw: '<label id="foo">',
			message: 'The "label" element is disallowed',
		},
	]);

	expect(
		(
			await mlRuleTest(
				rule,
				'<details><summary><label id="foo">foo</label></summary><input id="foo"/></details>',
				{
					nodeRule: [
						{
							selector: 'summary',
							rule: [':model(interactive)'],
						},
					],
				},
			)
		).violations,
	).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 19,
			raw: '<label id="foo">',
			message: 'The ":model(interactive)" element is disallowed',
		},
	]);
});

test('[disallowed-element-invalid-004] base after link via sibling selector', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<head><meta charset="UTF-8"><link rel="stylesheet" href="a.css"><base href="/"></head>',
		{ rule: [':is(link, script) ~ base'] },
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 65,
			raw: '<base href="/">',
			message: 'The ":is(link, script) ~ base" element is disallowed',
		},
	]);
});

test('[disallowed-element-invalid-005] base after script via sibling selector', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<head><meta charset="UTF-8"><script src="a.js"></script><base href="/"></head>',
		{ rule: [':is(link, script) ~ base'] },
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 57,
			raw: '<base href="/">',
			message: 'The ":is(link, script) ~ base" element is disallowed',
		},
	]);
});

test('[disallowed-element-valid-001] base before link and script is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<head><meta charset="UTF-8"><base href="/"><link rel="stylesheet" href="a.css"><script src="a.js"></script></head>',
		{ rule: [':is(link, script) ~ base'] },
	);
	expect(violations).toStrictEqual([]);
});

test('[disallowed-element-issue-3634-001] duplicate meta charset via sibling selector', async () => {
	const { violations } = await mlRuleTest(rule, '<head><meta charset="UTF-8"><meta charset="UTF-8"></head>', {
		rule: ['meta[charset] ~ meta[charset]'],
	});
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			col: 29,
			raw: '<meta charset="UTF-8">',
			message: 'The "meta[charset] ~ meta[charset]" element is disallowed',
		}),
	]);
});

test('[disallowed-element-issue-3634-002] single meta charset is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<head><meta charset="UTF-8"><title>test</title></head>', {
		rule: ['meta[charset] ~ meta[charset]'],
	});
	expect(violations).toStrictEqual([]);
});

test('[disallowed-element-issue-3634-003] duplicate meta description via sibling selector', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<head><meta name="description" content="a"><meta name="description" content="b"></head>',
		{ rule: ['meta[name="description" i] ~ meta[name="description" i]'] },
	);
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<meta name="description" content="b">',
		}),
	]);
});

test('[disallowed-element-issue-3634-004] single meta description is valid', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<head><meta name="description" content="page desc"><title>test</title></head>',
		{ rule: ['meta[name="description" i] ~ meta[name="description" i]'] },
	);
	expect(violations).toStrictEqual([]);
});

test('[disallowed-element-issue-3634-005] meta charset and http-equiv content-type coexistence', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<head><meta charset="UTF-8"><meta http-equiv="content-type" content="text/html; charset=UTF-8"></head>',
		{
			rule: [
				'meta[charset] ~ meta[http-equiv="content-type" i]',
				'meta[http-equiv="content-type" i] ~ meta[charset]',
			],
		},
	);
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<meta http-equiv="content-type" content="text/html; charset=UTF-8">',
		}),
	]);
});

test('[disallowed-element-issue-3634-008] http-equiv content-type before charset coexistence', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<head><meta http-equiv="content-type" content="text/html; charset=UTF-8"><meta charset="UTF-8"></head>',
		{
			rule: [
				'meta[charset] ~ meta[http-equiv="content-type" i]',
				'meta[http-equiv="content-type" i] ~ meta[charset]',
			],
		},
	);
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<meta charset="UTF-8">',
		}),
	]);
});

test('[disallowed-element-issue-3634-006] meta charset alone without http-equiv is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<head><meta charset="UTF-8"><title>test</title></head>', {
		rule: [
			'meta[charset] ~ meta[http-equiv="content-type" i]',
			'meta[http-equiv="content-type" i] ~ meta[charset]',
		],
	});
	expect(violations).toStrictEqual([]);
});

test('[disallowed-element-issue-3634-007] meta description case insensitive match', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<head><meta name="Description" content="a"><meta name="description" content="b"></head>',
		{ rule: ['meta[name="description" i] ~ meta[name="description" i]'] },
	);
	expect(violations).toStrictEqual([
		expect.objectContaining({
			severity: 'error',
			raw: '<meta name="description" content="b">',
		}),
	]);
});
