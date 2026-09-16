import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[no-event-handler-attr-invalid-001] disallows onclick', async () => {
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

test('[no-event-handler-attr-valid-001] allows onclick because ignores it', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e"></div>', {
		rule: {
			options: {
				ignore: 'onclick',
			},
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-invalid-002] ✔ onclick, ✘ onmouseleave', async () => {
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

test('[no-event-handler-attr-valid-002] ignore by regex', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="e => e"></div>', {
		rule: {
			options: {
				ignore: '/^onc/',
			},
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-invalid-003] value: ["click"] reports only click', async () => {
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

test('[no-event-handler-attr-invalid-004] value: ["click", "keydown"] reports matching events', async () => {
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

test('[no-event-handler-attr-invalid-005] value: ["Click"] is case-insensitive', async () => {
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

test('[no-event-handler-attr-invalid-006] value: ["/^mouse/"] regex pattern', async () => {
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

test('[no-event-handler-attr-invalid-007] value: ["click"] with ignore: "onclick" — ignore takes priority', async () => {
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

test('[no-event-handler-attr-parser-001] value: ["click"] with JSX onClick', async () => {
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

test('[no-event-handler-attr-parser-002] value: ["mousedown"] does not report JSX onClick', async () => {
	const { violations } = await mlRuleTest(rule, '<div onClick={fn}></div>', {
		rule: { value: ['mousedown'] },
		parser: { '.*': '@markuplint/jsx-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-valid-003] non-event attributes are not affected', async () => {
	const { violations } = await mlRuleTest(rule, '<div class="foo" id="bar"></div>', { rule: { value: ['click'] } });
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-valid-004] value: false disables the rule', async () => {
	const { violations } = await mlRuleTest(rule, '<div onclick="fn()"></div>', { rule: { value: false } });
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-valid-005] "on" attribute alone is not treated as an event handler', async () => {
	const { violations } = await mlRuleTest(rule, '<div on="handler"></div>');
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-parser-003] value: ["click"] does not report Vue @click', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div @click="fn()"></div></template>', {
		rule: { value: ['click'] },
		parser: { '.*': '@markuplint/vue-parser' },
		specs: { '.*': '@markuplint/vue-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-invalid-008] value: ["click"] with regex ignore — ignore takes priority', async () => {
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

test('[no-event-handler-attr-issue-4044-001] does not report Vue @click directive', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div @click="fn()"></div></template>', {
		parser: { '.*': '@markuplint/vue-parser' },
		specs: { '.*': '@markuplint/vue-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-issue-4044-002] does not report Alpine.js @click directive', async () => {
	const { violations } = await mlRuleTest(rule, '<div @click="fn()"></div>', {
		parser: { '.*': '@markuplint/alpine-parser' },
		specs: { '.*': '@markuplint/alpine-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-issue-4044-003] does not report htmx hx-on:click directive', async () => {
	const { violations } = await mlRuleTest(rule, '<div hx-on:click="fn()"></div>', {
		specs: { '.*': '@markuplint/htmx-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-issue-4044-004] does not report Svelte on:click directive', async () => {
	const { violations } = await mlRuleTest(rule, '<div on:click={fn}></div>', {
		parser: { '.*': '@markuplint/svelte-parser' },
		specs: { '.*': '@markuplint/svelte-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-issue-4044-005] still reports a literal onclick attribute in a Vue template', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div onclick="fn()"></div></template>', {
		parser: { '.*': '@markuplint/vue-parser' },
		specs: { '.*': '@markuplint/vue-spec' },
	});
	expect(violations).toStrictEqual([
		{
			severity: 'warning',
			line: 1,
			col: 16,
			raw: 'onclick="fn()"',
			message: 'The "onclick" attribute is disallowed',
		},
	]);
});

test('[no-event-handler-attr-issue-4044-006] does not report Vue v-on:click directive (long form)', async () => {
	const { violations } = await mlRuleTest(rule, '<template><div v-on:click="fn()"></div></template>', {
		parser: { '.*': '@markuplint/vue-parser' },
		specs: { '.*': '@markuplint/vue-spec' },
	});
	expect(violations).toStrictEqual([]);
});

test('[no-event-handler-attr-issue-4044-007] does not report Alpine.js x-on:click directive (long form)', async () => {
	const { violations } = await mlRuleTest(rule, '<div x-on:click="fn()"></div>', {
		parser: { '.*': '@markuplint/alpine-parser' },
		specs: { '.*': '@markuplint/alpine-spec' },
	});
	expect(violations).toStrictEqual([]);
});
