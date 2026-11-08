import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-duplicate-id-invalid-001] no-duplicate-id', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"><p id="a"></p></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			message: 'The value of the "id" attribute is duplicated',
			line: 1,
			col: 16,
			raw: 'id="a"',
		},
	]);
});

test('[no-duplicate-id-valid-001] no-duplicate-id', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div>');
	expect(violations.length).toBe(0);
});

test('[no-duplicate-id-invalid-002] no-duplicate-id', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div><div id="a"></div><div id="a"></div>');
	expect(violations.length).toBe(2);
});

test('[no-duplicate-id-valid-002] no-duplicate-id', async () => {
	const { violations } = await mlRuleTest(rule, '<div id="a"></div><div id="b"></div><div id="c"></div>');
	expect(violations.length).toBe(0);
});

test('[no-duplicate-id-parser-001] in Vue', async () => {
	const { violations } = await mlRuleTest(
		rule,
		`<template>
	<div v-if="bool"><span :id="uuid"></span></div>
	<div v-else><span :id="uuid"></span></div>
</template>`,
		{
			parser: {
				'.*': '@markuplint/vue-parser',
			},
		},
	);
	expect(violations.length).toBe(0);
});

describe('the id is unique in a tree: the content of a template and a declarative shadow root are trees of their own', () => {
	const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };
	const react = { parser: { '.*': '@markuplint/jsx-parser' }, specs: { '.*': '@markuplint/react-spec' } };

	test('[no-duplicate-id-issue-4489-001] an id in a template and a declarative shadow root is not a duplicate', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>t</title></head>
<body>
<div id="a"></div>
<template><div id="a"></div></template>
<div id="b"></div>
<div><template shadowrootmode="open"><div id="b"></div></template></div>
</body>
</html>`,
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-issue-4489-002] a duplicate in the content of one template is reported', async () => {
		const { violations } = await mlRuleTest(rule, '<template><div id="a"></div><div id="a"></div></template>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 34,
				raw: 'id="a"',
			},
		]);
	});

	test('[no-duplicate-id-issue-4489-003] a duplicate in one declarative shadow root is reported', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><template shadowrootmode="open"><p id="a"></p><p id="a"></p></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 55,
				raw: 'id="a"',
			},
		]);
	});

	test('[no-duplicate-id-issue-4489-004] the same id in two templates is not a duplicate', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><p id="a"></p></template><template><p id="a"></p></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-issue-4489-005] a template in a template is a tree of its own', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><p id="a"></p><template><p id="a"></p></template></template>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-issue-4489-006] a template whose shadow root is not attached is an element of its tree', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div id="a"></div><div><template shadowrootmode="open"></template><template shadowrootmode="open" id="a"></template></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 99,
				raw: 'id="a"',
			},
		]);
	});

	test('[no-duplicate-id-issue-4489-007] the id of a template that is in no tree does not count', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div id="a"></div><div><template shadowrootmode="open" id="a"></template></div>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-duplicate-id-issue-4489-008] the ids are compared after the character references are resolved', async () => {
		const { violations } = await mlRuleTest(rule, '<div id="a"></div><div id="&#97;"></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 24,
				raw: 'id="&#97;"',
			},
		]);
	});

	test('[no-duplicate-id-issue-4489-009] the children of a template of Vue are in the tree of the document', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><div id="a"></div><template><div id="a"></div></template></template>',
			vue,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 44,
				raw: 'id="a"',
			},
		]);
	});

	test('[no-duplicate-id-issue-4489-010] the children of a template of React are in the tree of the document', async () => {
		const { violations } = await mlRuleTest(rule, '<><div id="a" /><template><div id="a" /></template></>', react);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				message: 'The value of the "id" attribute is duplicated',
				line: 1,
				col: 32,
				raw: 'id="a"',
			},
		]);
	});
});
