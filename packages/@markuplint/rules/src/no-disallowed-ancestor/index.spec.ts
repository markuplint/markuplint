import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

test('[no-disallowed-ancestor-invalid-001] address inside address', async () => {
	const { violations: violations1 } = await mlRuleTest(rule, '<address><address></address></address>');
	expect(violations1).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			message: 'The "address" element must not appear as a descendant of the "address" element',
			raw: '<address>',
		},
	]);

	const { violations: violations2 } = await mlRuleTest(
		rule,
		'<address><div><div><div><address></address></div></div></div></address>',
	);
	expect(violations2).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 25,
			message: 'The "address" element must not appear as a descendant of the "address" element',
			raw: '<address>',
		},
	]);
});

test('[no-disallowed-ancestor-issue-3632-001] main must not be descendant of article', async () => {
	const { violations } = await mlRuleTest(rule, '<article><main>x</main></article>');
	expect(violations).toContainEqual(
		expect.objectContaining({
			message: 'The "main" element must not appear as a descendant of the "article" element',
		}),
	);
});

test('[no-disallowed-ancestor-issue-3632-002] main standalone is valid', async () => {
	const { violations } = await mlRuleTest(rule, '<main>x</main>');
	expect(violations).toStrictEqual([]);
});

test('[no-disallowed-ancestor-issue-3632-003] main in deeply nested nav', async () => {
	const { violations } = await mlRuleTest(rule, '<nav><div><div><main>x</main></div></div></nav>');
	expect(violations).toContainEqual(
		expect.objectContaining({
			message: 'The "main" element must not appear as a descendant of the "nav" element',
		}),
	);
});

test('[no-disallowed-ancestor-issue-3632-004] footer in header', async () => {
	const { violations } = await mlRuleTest(rule, '<header><footer>x</footer></header>');
	expect(violations).toContainEqual(
		expect.objectContaining({
			message: 'The "footer" element must not appear as a descendant of the "header" element',
		}),
	);
});

describe('main must be a hierarchically correct main element', () => {
	test('[no-disallowed-ancestor-issue-4482-001] main in section', async () => {
		const { violations } = await mlRuleTest(rule, '<section><main>text</main></section>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "main" element must not appear as a descendant of the "section" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-002] the nearest ancestor that is not permitted is named', async () => {
		const { violations } = await mlRuleTest(rule, '<div><section><div><main>text</main></div></section></div>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 20,
				message: 'The "main" element must not appear as a descendant of the "section" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-003] main in a form that has an accessible name', async () => {
		const { violations } = await mlRuleTest(rule, '<form aria-label="Search"><main>text</main></form>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 27,
				message: 'The "main" element must not appear as a descendant of the "form" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-004] main in a form named by aria-labelledby', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<span id="l">Search</span><form aria-labelledby="l"><main>text</main></form>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 53,
				message: 'The "main" element must not appear as a descendant of the "form" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-005] main in a form named by title', async () => {
		const { violations } = await mlRuleTest(rule, '<form title="Search"><main>text</main></form>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 22,
				message: 'The "main" element must not appear as a descendant of the "form" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-006] main in a list item', async () => {
		const { violations } = await mlRuleTest(rule, '<ul><li><main>text</main></li></ul>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "main" element must not appear as a descendant of the "li" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-007] main in article, which the allow list does not name', async () => {
		const { violations } = await mlRuleTest(rule, '<article><main>text</main></article>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "main" element must not appear as a descendant of the "article" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-008] main in main', async () => {
		const { violations } = await mlRuleTest(rule, '<main><main>text</main></main>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 7,
				message: 'The "main" element must not appear as a descendant of the "main" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-009] a custom element does not hide an ancestor that is not permitted', async () => {
		const { violations } = await mlRuleTest(rule, '<x-a><article><main>text</main></article></x-a>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 15,
				message: 'The "main" element must not appear as a descendant of the "article" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-010] main in an unknown HTML element, which is not a custom element', async () => {
		const { violations } = await mlRuleTest(rule, '<foobar><main>text</main></foobar>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "main" element must not appear as a descendant of the "foobar" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-011] main in dialog', async () => {
		const { violations } = await mlRuleTest(rule, '<dialog><main>text</main></dialog>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 9,
				message: 'The "main" element must not appear as a descendant of the "dialog" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-012] main in slot, even in a custom element', async () => {
		const { violations } = await mlRuleTest(rule, '<x-a><slot><main>text</main></slot></x-a>');
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 12,
				message: 'The "main" element must not appear as a descendant of the "slot" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-013] main in foreignObject of svg', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<div><svg><foreignObject><main>text</main></foreignObject></svg></div>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 26,
				message: 'The "main" element must not appear as a descendant of the "foreignObject" element',
				raw: '<main>',
			},
		]);
	});

	test('[no-disallowed-ancestor-issue-4482-014] main under html, body, div and form', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<html><body><div><form><main>text</main></form></div></body></html>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-015] main in nested div', async () => {
		const { violations } = await mlRuleTest(rule, '<div><div><main>text</main></div></div>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-016] main in a form without an accessible name', async () => {
		const { violations } = await mlRuleTest(rule, '<form><main>text</main></form>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-017] main in a form whose accessible name is empty', async () => {
		const { violations } = await mlRuleTest(rule, '<form aria-label=""><main>text</main></form>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-018] main in a form whose accessible name is only whitespace', async () => {
		const { violations } = await mlRuleTest(rule, '<form aria-label="  "><main>text</main></form>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-019] main in a form whose name from aria-labelledby is empty', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<span id="l"></span><form aria-labelledby="l"><main>text</main></form>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-020] main in a form that aria-labelledby points to a missing id', async () => {
		const { violations } = await mlRuleTest(rule, '<form aria-labelledby="none"><main>text</main></form>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-021] main in an autonomous custom element', async () => {
		const { violations } = await mlRuleTest(rule, '<x-layout><main>text</main></x-layout>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-022] a main element in the SVG namespace is not the HTML main element', async () => {
		const { violations } = await mlRuleTest(rule, '<svg><main>text</main></svg>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-023] main in the content of a template has no ancestor', async () => {
		const { violations } = await mlRuleTest(rule, '<section><template><main>text</main></template></section>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-024] a template nested in a template is a boundary too', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<section><template><template><main>text</main></template></template></section>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-disallowed-ancestor-issue-4482-025] a forbidden ancestor beyond a template does not count', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<address><template><address>text</address></template></address>',
		);
		expect(violations).toStrictEqual([]);
	});

	describe('pretenders and fragments', () => {
		const jsx = { parser: { '.*': '@markuplint/jsx-parser' } };

		test('[no-disallowed-ancestor-issue-4482-026] a component that stands for div is permitted', async () => {
			const { violations } = await mlRuleTest(rule, '<Wrapper><main>text</main></Wrapper>', {
				...jsx,
				pretenders: [{ selector: 'Wrapper', as: 'div' }],
			});
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-027] a component that stands for section is judged as section', async () => {
			const { violations } = await mlRuleTest(rule, '<Wrapper><main>text</main></Wrapper>', {
				...jsx,
				pretenders: [{ selector: 'Wrapper', as: 'section' }],
			});
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 10,
					message: 'The "main" element must not appear as a descendant of the "section" element',
					raw: '<main>',
				},
			]);
		});

		test('[no-disallowed-ancestor-issue-4482-028] a component that stands for a custom element is permitted', async () => {
			const { violations } = await mlRuleTest(rule, '<Wrapper><main>text</main></Wrapper>', {
				...jsx,
				pretenders: [{ selector: 'Wrapper', as: 'x-wrapper' }],
			});
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-029] a component without a pretender is a custom element', async () => {
			const { violations } = await mlRuleTest(rule, '<Layout><main>text</main></Layout>', jsx);
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-030] a fragment is not an ancestor', async () => {
			const { violations } = await mlRuleTest(rule, '<div><><main>text</main></></div>', jsx);
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-031] React.Fragment is not an ancestor', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<div><React.Fragment><main>text</main></React.Fragment></div>',
				jsx,
			);
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-032] an ancestor beyond a fragment is still judged', async () => {
			const { violations } = await mlRuleTest(rule, '<section><><main>text</main></></section>', jsx);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 12,
					message: 'The "main" element must not appear as a descendant of the "section" element',
					raw: '<main>',
				},
			]);
		});

		// The accessible name of a form decides, and a static check reads a dynamic value as a name.
		// Known limitation: the name may be empty at runtime, which the rule does not see.
		test('[no-disallowed-ancestor-issue-4482-033] main in a form with a dynamic aria-label is reported', async () => {
			const { violations } = await mlRuleTest(rule, '<form aria-label={x}><main>text</main></form>', jsx);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 22,
					message: 'The "main" element must not appear as a descendant of the "form" element',
					raw: '<main>',
				},
			]);
		});

		test('[no-disallowed-ancestor-issue-4482-034] main in a form with a dynamic title is reported', async () => {
			const { violations } = await mlRuleTest(rule, '<form title={x}><main>text</main></form>', jsx);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 17,
					message: 'The "main" element must not appear as a descendant of the "form" element',
					raw: '<main>',
				},
			]);
		});
	});

	describe('a template with a directive of a template engine', () => {
		const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };

		test('[no-disallowed-ancestor-issue-4482-035] a Vue template with v-if is walked through', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><section><template v-if="x"><main>text</main></template></section></template>',
				vue,
			);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 39,
					message: 'The "main" element must not appear as a descendant of the "section" element',
					raw: '<main>',
				},
			]);
		});

		test('[no-disallowed-ancestor-issue-4482-036] a Vue template with v-for is walked through', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><section><template v-for="i in 3"><main>text</main></template></section></template>',
				vue,
			);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 45,
					message: 'The "main" element must not appear as a descendant of the "section" element',
					raw: '<main>',
				},
			]);
		});

		test('[no-disallowed-ancestor-issue-4482-037] a Vue template with v-slot is walked through', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><x-a><template v-slot:x><section><main>text</main></section></template></x-a></template>',
				vue,
			);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 44,
					message: 'The "main" element must not appear as a descendant of the "section" element',
					raw: '<main>',
				},
			]);
		});

		test('[no-disallowed-ancestor-issue-4482-038] a Vue template with v-if is not judged as an ancestor', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><div><template v-if="x"><main>text</main></template></div></template>',
				vue,
			);
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-039] a Vue template with v-if is walked through for a forbidden ancestor', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><address><template v-if="x"><address>text</address></template></address></template>',
				vue,
			);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 39,
					message: 'The "address" element must not appear as a descendant of the "address" element',
					raw: '<address>',
				},
			]);
		});

		test('[no-disallowed-ancestor-issue-4482-040] a Vue template without a directive is an element of the document', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><section><template><main>text</main></template></section></template>',
				vue,
			);
			expect(violations).toStrictEqual([
				{
					severity: 'error',
					line: 1,
					col: 30,
					message: 'The "main" element must not appear as a descendant of the "template" element',
					raw: '<main>',
				},
			]);
		});

		test('[no-disallowed-ancestor-issue-4482-041] main directly in the root template of a Vue file', async () => {
			const { violations } = await mlRuleTest(rule, '<template><main>text</main></template>', vue);
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-042] main in slot of Vue is not judged as the HTML slot element', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<template><div><slot><main>text</main></slot></div></template>',
				vue,
			);
			expect(violations).toStrictEqual([]);
		});
	});

	describe('components and constructs of other languages', () => {
		test('[no-disallowed-ancestor-issue-4482-043] a member expression component is a custom element', async () => {
			const { violations } = await mlRuleTest(rule, '<Layout.Content><main>text</main></Layout.Content>', {
				parser: { '.*': '@markuplint/jsx-parser' },
			});
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-044] slot of Svelte is not judged as the HTML slot element', async () => {
			const { violations } = await mlRuleTest(rule, '<div><slot><main>text</main></slot></div>', {
				parser: { '.*': '@markuplint/svelte-parser' },
			});
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-045] svelte:fragment is not an ancestor', async () => {
			const { violations } = await mlRuleTest(
				rule,
				'<div><svelte:fragment><main>text</main></svelte:fragment></div>',
				{ parser: { '.*': '@markuplint/svelte-parser' } },
			);
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-046] Fragment of Astro is not an ancestor', async () => {
			const { violations } = await mlRuleTest(rule, '<div><Fragment><main>text</main></Fragment></div>', {
				parser: { '.*': '@markuplint/astro-parser' },
			});
			expect(violations).toStrictEqual([]);
		});

		test('[no-disallowed-ancestor-issue-4482-047] footer in the SVG namespace is not the HTML footer element', async () => {
			const { violations } = await mlRuleTest(rule, '<svg><footer><footer></footer></footer></svg>');
			expect(violations).toStrictEqual([]);
		});
	});
});

test('[no-disallowed-ancestor-issue-4584-001] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<address><address></address></address>', undefined, false, 'ja');

	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 10,
			message: '要素「address」は要素「address」の子孫に出現するべきではありません',
			raw: '<address>',
		},
	]);
});
