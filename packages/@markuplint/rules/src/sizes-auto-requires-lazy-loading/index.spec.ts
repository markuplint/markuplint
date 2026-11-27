import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('Basics', () => {
	test('[sizes-auto-requires-lazy-loading-001] element without srcset is ignored', async () => {
		expect((await mlRuleTest(rule, '<img src="image.png" alt="photo">')).violations).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-002] source outside picture is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<video><source src="video.mp4" type="video/mp4"></video>')).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-003] sizes=auto with loading=lazy on img', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="auto" loading="lazy" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-004] sizes="auto, 100vw" with loading=lazy on img', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="auto, 100vw" loading="lazy" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-005] source[sizes=auto] with sibling img[loading=lazy] without sizes=auto → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w, l.webp 1024w" sizes="auto"><img src="l.jpg" loading="lazy" alt="photo"></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 60,
				message:
					'The "source" element with sizes="auto" requires the following sibling "img" element to have sizes="auto"',
				raw: 'auto',
			},
		]);
	});

	test('[sizes-auto-requires-lazy-loading-006] source[sizes=auto] with non-adjacent sibling img[loading=lazy] without sizes=auto → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="a.webp 480w" sizes="auto" type="image/webp"><source srcset="a.jpg 480w" sizes="100vw"><img src="a.jpg" loading="lazy" alt="p"></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 46,
				message:
					'The "source" element with sizes="auto" requires the following sibling "img" element to have sizes="auto"',
				raw: 'auto',
			},
		]);
	});
});

describe('sizes=auto on img requires loading=lazy', () => {
	test('[sizes-auto-requires-lazy-loading-007] sizes=auto without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 1024w" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('auto');
	});

	test('[sizes-auto-requires-lazy-loading-008] sizes=auto with loading=eager → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="eager" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-009] sizes=auto with loading=lazy → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="lazy" src="l.png" alt="p">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-010] sizes="auto, 100vw" without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w" sizes="auto, 100vw" src="s.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-011] sizes="100vw, auto" (auto not first) → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="100vw, auto" loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-012] sizes=AUTO (uppercase) without loading → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="AUTO" src="s.png" alt="p">');
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-013] sizes=" auto " (whitespace) with loading=lazy → violation', async () => {
		// HTML LS § sizes attributes: on the img, no whitespace before or directly after auto.
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes=" auto " loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 33,
				message:
					'The "sizes" attribute with "auto" must be exactly "auto" or start with "auto," on the "img" element, with no whitespace or comments before or directly after "auto"',
				raw: ' auto ',
			},
		]);
	});
});

describe('sizes=auto on source requires the following img to have loading=lazy and sizes=auto', () => {
	test('[sizes-auto-requires-lazy-loading-014] source[sizes=auto] + img without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('auto');
	});

	test('[sizes-auto-requires-lazy-loading-015] source[sizes=auto] + img[loading=eager] → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="eager" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-016] source[sizes=auto] + img[loading=lazy] without sizes=auto → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="lazy" alt="p"></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 46,
				message:
					'The "source" element with sizes="auto" requires the following sibling "img" element to have sizes="auto"',
				raw: 'auto',
			},
		]);
	});

	test('[sizes-auto-requires-lazy-loading-017] source[sizes=auto] with no following img → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><source srcset="s.webp 480w" sizes="auto"></picture>');
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-018] source + source + img[loading=lazy] without sizes=auto → violation', async () => {
		// The escape checks the *following img*, not the immediately next sibling.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="a.webp 480w" sizes="auto" media="(min-width: 600px)"><source srcset="b.jpg 480w"><img src="b.jpg" loading="lazy" alt="p"></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 46,
				message:
					'The "source" element with sizes="auto" requires the following sibling "img" element to have sizes="auto"',
				raw: 'auto',
			},
		]);
	});
});

describe('Edge cases', () => {
	test('[sizes-auto-requires-lazy-loading-019] w + x mixing with sizes=auto → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-020] rule disabled → no violations', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="auto" src="l.png" alt="p">', {
					rule: false,
				})
			).violations,
		).toStrictEqual([]);
	});
});

describe('source[sizes=auto]: the following img must allow auto-sizes', () => {
	const LOADING =
		'The "source" element with sizes="auto" requires the following sibling "img" element to have loading="lazy"';
	const SIZES =
		'The "source" element with sizes="auto" requires the following sibling "img" element to have sizes="auto"';
	const BOTH =
		'The "source" element with sizes="auto" requires the following sibling "img" element to have loading="lazy" and sizes="auto"';
	const source = '<source srcset="s.webp 480w" sizes="auto">';
	const vue = { parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } };

	test('[sizes-auto-requires-lazy-loading-021] source[sizes=auto] + img[loading=lazy][sizes=auto] → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<picture>${source}<img src="s.jpg" srcset="s.jpg 480w" loading="lazy" sizes="auto" alt="p"></picture>`,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-022] the following img decides, not the next sibling', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<picture>${source}<source srcset="b.jpg 480w" sizes="100vw"><img src="b.jpg" loading="lazy" sizes="auto" alt="p"></picture>`,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-023] sizes "AUTO, 100vw" on the img → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<picture>${source}<img src="s.jpg" loading="LAZY" sizes="AUTO, 100vw" alt="p"></picture>`,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-024] sizes="auto 100vw" is not auto: nothing to require', async () => {
		// HTML LS § allows-auto-sizes: the value is "auto" or starts with "auto,".
		expect(
			(await mlRuleTest(rule, '<img srcset="a.png 480w" sizes="auto 100vw" src="a.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-025] img[sizes=auto] with loading="LAZY" (ASCII case-insensitive) → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="a.png 480w" sizes="auto" loading="LAZY" src="a.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-026] sizes=" auto " (not trimmed) specifies auto but is not the literal form, without loading=lazy', async () => {
		// HTML LS § sizes attributes: the grammar reads it as auto, and the img needs the literal form.
		expect(
			(await mlRuleTest(rule, '<img srcset="a.png 480w" sizes=" auto " src="a.png" alt="p">')).violations,
		).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 33,
				message:
					'The "sizes" attribute with "auto" must be exactly "auto" or start with "auto," on the "img" element, with no whitespace or comments before or directly after "auto"',
				raw: ' auto ',
			},
			{
				severity: 'error',
				line: 1,
				col: 33,
				message: 'The "sizes" attribute with "auto" requires the "loading" attribute to be "lazy"',
				raw: ' auto ',
			},
		]);
	});

	test('[sizes-auto-requires-lazy-loading-027] source[sizes="auto 100vw"] is not auto: the following img is not checked', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w" sizes="auto 100vw"><img src="s.jpg" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-028] img[sizes=auto] without loading=lazy → the loading message', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<picture>${source}<img src="s.jpg" loading="eager" sizes="auto" alt="p"></picture>`,
		);
		expect(violations.map(v => v.message)).toStrictEqual([LOADING]);
	});

	test('[sizes-auto-requires-lazy-loading-029] img[loading=lazy][sizes=100vw] → the sizes message', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<picture>${source}<img src="s.jpg" loading="lazy" sizes="100vw" alt="p"></picture>`,
		);
		expect(violations.map(v => v.message)).toStrictEqual([SIZES]);
	});

	test('[sizes-auto-requires-lazy-loading-030] img without loading and without sizes=auto → both are named', async () => {
		const { violations } = await mlRuleTest(rule, `<picture>${source}<img src="s.jpg" alt="p"></picture>`);
		expect(violations.map(v => v.message)).toStrictEqual([BOTH]);
	});

	test('[sizes-auto-requires-lazy-loading-031] source[sizes=auto] with no following img → the loading message', async () => {
		const { violations } = await mlRuleTest(rule, `<picture>${source}</picture>`);
		expect(violations.map(v => v.message)).toStrictEqual([LOADING]);
	});

	test('[sizes-auto-requires-lazy-loading-032] Vue dynamic loading on the img → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<template><picture>${source}<img src="s.jpg" alt="p" :loading="l" sizes="auto"></picture></template>`,
					vue,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-033] Vue dynamic loading on img[sizes=auto] → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><img srcset="a.png 480w" sizes="auto" :loading="l" src="a.png" alt="p"></template>',
					vue,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-034] Vue dynamic sizes on the img → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<template><picture>${source}<img src="s.jpg" alt="p" loading="lazy" :sizes="s"></picture></template>`,
					vue,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-035] Vue dynamic loading with a known sizes that is not auto → the sizes message', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<template><picture>${source}<img src="s.jpg" alt="p" :loading="l" sizes="100vw"></picture></template>`,
			vue,
		);
		expect(violations.map(v => v.message)).toStrictEqual([SIZES]);
	});

	test('[sizes-auto-requires-lazy-loading-036] JSX spread props on the img → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<picture>${source.replace('>', ' />')}<img {...p} src="s.jpg" alt="p" /></picture>`,
					{
						parser: { '.*': '@markuplint/jsx-parser' },
					},
				)
			).violations,
		).toStrictEqual([]);
	});
});

describe('auto read by the <source-size-list> grammar; the img needs the literal form', () => {
	const LITERAL =
		'The "sizes" attribute with "auto" must be exactly "auto" or start with "auto," on the "img" element, with no whitespace or comments before or directly after "auto"';

	test('[sizes-auto-requires-lazy-loading-037] img sizes="auto , 100vw" (whitespace directly after auto) → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w" sizes="auto , 100vw" loading="lazy" src="s.png" alt="p">',
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 33, message: LITERAL, raw: 'auto , 100vw' },
		]);
	});

	test('[sizes-auto-requires-lazy-loading-038] img sizes with a comment directly after auto → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w" sizes="auto/* c */, 100vw" loading="lazy" src="s.png" alt="p">',
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 33, message: LITERAL, raw: 'auto/* c */, 100vw' },
		]);
	});

	test('[sizes-auto-requires-lazy-loading-039] img sizes with a comment before auto → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w" sizes="/* c */auto" loading="lazy" src="s.png" alt="p">',
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 33, message: LITERAL, raw: '/* c */auto' },
		]);
	});

	test('[sizes-auto-requires-lazy-loading-040] img sizes="auto,100vw" with loading=lazy → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="auto,100vw" loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-041] whitespace around auto on the source is allowed → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w" sizes=" auto , 100vw"><img src="s.jpg" srcset="s.jpg 480w" loading="lazy" sizes="auto" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-042] auto after a comment on the source still requires the img to allow auto-sizes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="/* c */ auto, 100vw"><img src="s.jpg" alt="p"></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 46,
				message:
					'The "source" element with sizes="auto" requires the following sibling "img" element to have loading="lazy" and sizes="auto"',
				raw: '/* c */ auto, 100vw',
			},
		]);
	});

	test('[sizes-auto-requires-lazy-loading-043] source[sizes=auto] + img[loading=lazy][sizes=" auto"] → both are reported', async () => {
		// The img's sizes specifies auto but not in the literal form, so the img does not allow auto-sizes.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" srcset="s.jpg 480w" loading="lazy" sizes=" auto" alt="p"></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 46,
				message:
					'The "source" element with sizes="auto" requires the following sibling "img" element to have sizes="auto"',
				raw: 'auto',
			},
			{ severity: 'error', line: 1, col: 111, message: LITERAL, raw: ' auto' },
		]);
	});

	test('[sizes-auto-requires-lazy-loading-044] img sizes with an escaped auto is auto, not the literal form → violation', async () => {
		// CSS Syntax § consume an escaped code point: `\61 uto` is the ident "auto".
		const { violations } = await mlRuleTest(
			rule,
			String.raw`<img srcset="s.png 480w" sizes="\61 uto, 100vw" loading="lazy" src="s.png" alt="p">`,
		);
		expect(violations).toStrictEqual([
			{ severity: 'error', line: 1, col: 33, message: LITERAL, raw: String.raw`\61 uto, 100vw` },
		]);
	});

	test('[sizes-auto-requires-lazy-loading-045] an escaped auto on the source requires the img to allow auto-sizes', async () => {
		const { violations } = await mlRuleTest(
			rule,
			String.raw`<picture><source srcset="s.webp 480w" sizes="a\75 to, 100vw"><img src="s.jpg" alt="p"></picture>`,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 46,
				message:
					'The "source" element with sizes="auto" requires the following sibling "img" element to have loading="lazy" and sizes="auto"',
				raw: String.raw`a\75 to, 100vw`,
			},
		]);
	});

	test('[sizes-auto-requires-lazy-loading-046] an escaped auto on the source with an img that allows auto-sizes → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					String.raw`<picture><source srcset="s.webp 480w" sizes="\41 UTO"><img src="s.jpg" srcset="s.jpg 480w" loading="lazy" sizes="auto" alt="p"></picture>`,
				)
			).violations,
		).toStrictEqual([]);
	});
});
