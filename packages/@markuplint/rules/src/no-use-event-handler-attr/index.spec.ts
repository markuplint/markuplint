import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('disallows onclick', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e"></div>');
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'onclick="e => e"',
			message: 'The "onclick" attribute is disallowed',
		},
	]);
});

test('allows onclick because ignores it', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e"></div>', {
		rule: {
			options: {
				ignore: 'onclick',
			},
		},
	});
	expect(violations).toStrictEqual([]);
});

test('✔ onclick, ✘ onmouseleave', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e" onmouseleave="e => e"></div>', {
		rule: {
			options: {
				ignore: 'onclick',
			},
		},
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 23,
			raw: 'onmouseleave="e => e"',
			message: 'The "onmouseleave" attribute is disallowed',
		},
	]);
});

test('ignore by regex', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e"></div>', {
		rule: {
			options: {
				ignore: '/^onc/',
			},
		},
	});
	expect(violations).toStrictEqual([]);
});

test('value: ["click"] reports only click', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="fn()" onmouseover="fn()"></div>', {
		rule: { value: ['click'] },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'onclick="fn()"',
			message: 'The "onclick" attribute is disallowed',
		},
	]);
});

test('value: ["click", "keydown"] reports matching events', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="fn()" onkeydown="fn()" onmouseover="fn()"></div>', {
		rule: { value: ['click', 'keydown'] },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'onclick="fn()"',
			message: 'The "onclick" attribute is disallowed',
		},
		{
			severity: 'warning',
			line: 1,
			col: 21,
			raw: 'onkeydown="fn()"',
			message: 'The "onkeydown" attribute is disallowed',
		},
	]);
});

test('value: ["Click"] is case-insensitive', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="fn()"></div>', { rule: { value: ['Click'] } });
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'onclick="fn()"',
			message: 'The "onclick" attribute is disallowed',
		},
	]);
});

test('value: ["/^mouse/"] regex pattern', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="fn()" onmousedown="fn()" onmouseover="fn()"></div>', {
		rule: { value: ['/^mouse/'] },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 21,
			raw: 'onmousedown="fn()"',
			message: 'The "onmousedown" attribute is disallowed',
		},
		{
			severity: 'warning',
			line: 1,
			col: 40,
			raw: 'onmouseover="fn()"',
			message: 'The "onmouseover" attribute is disallowed',
		},
	]);
});

test('value: ["click"] with ignore: "onclick" — ignore takes priority', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="fn()" onmousedown="fn()"></div>', {
		rule: { value: ['click', 'mousedown'], options: { ignore: 'onclick' } },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 21,
			raw: 'onmousedown="fn()"',
			message: 'The "onmousedown" attribute is disallowed',
		},
	]);
});

test('value: ["click"] with JSX onClick', async () => {
	const { violations } = await mlRuleTest(rule, '<div onClick={fn}></div>', {
		rule: { value: ['click'] },
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 6,
			raw: 'onClick={fn}',
			message: 'The "onClick" attribute is disallowed',
		},
	]);
});

test('value: ["mousedown"] does not report JSX onClick', async () => {
	const { violations } = await mlRuleTest(rule, '<div onClick={fn}></div>', {
		rule: { value: ['mousedown'] },
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('non-event attributes are not affected', async () => {
	const { violations } = await mlRuleTest(rule, '<div class="foo" id="bar"></div>', { rule: { value: ['click'] } });
	expect(violations).toStrictEqual([]);
});

test('value: false disables the rule', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="fn()"></div>', { rule: { value: false } });
	expect(violations).toStrictEqual([]);
});

test('"on" attribute alone is not treated as an event handler', async () => {
	const { violations } = await mlRuleTest(rule, '<div on="handler"></div>');
	expect(violations).toStrictEqual([]);
});

test('value: ["click"] with Vue @click', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div @click="fn()"></div></template>', {
		rule: { value: ['click'] },
		parser: { '.*': '@markuplint/vue-parser' },
		specs: { '.*': '@markuplint/vue-spec' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 16,
			raw: '@click="fn()"',
			message: 'The "onclick" attribute is disallowed',
		},
	]);
});

test('value: ["click"] with regex ignore — ignore takes priority', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="fn()" onmousedown="fn()"></div>', {
		rule: { value: ['click', 'mousedown'], options: { ignore: '/^onclick$/' } },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 21,
			raw: 'onmousedown="fn()"',
			message: 'The "onmousedown" attribute is disallowed',
		},
	]);
});
