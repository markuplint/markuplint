import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('No violations', () => {
	test('[sizes-auto-requires-lazy-loading-valid-001] element without srcset is ignored', async () => {
		expect((await mlRuleTest(rule, '<img src="image.png" alt="photo">')).violations).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-002] source outside picture is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<video><source src="video.mp4" type="video/mp4"></video>')).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-003] sizes=auto with loading=lazy on img', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="auto" loading="lazy" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-004] sizes="auto, 100vw" with loading=lazy on img', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="auto, 100vw" loading="lazy" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-005] source[sizes=auto] with sibling img[loading=lazy]', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w, l.webp 1024w" sizes="auto"><img src="l.jpg" loading="lazy" alt="photo"></picture>',
		);
		// Behavior change: the img allows auto-sizes only with loading="lazy" and sizes="auto"
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
		// expect(violations).toStrictEqual([]); // previous
	});

	test('[sizes-auto-requires-lazy-loading-valid-006] source[sizes=auto] with non-adjacent sibling img[loading=lazy]', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="a.webp 480w" sizes="auto" type="image/webp"><source srcset="a.jpg 480w" sizes="100vw"><img src="a.jpg" loading="lazy" alt="p"></picture>',
		);
		// Behavior change: the img allows auto-sizes only with loading="lazy" and sizes="auto"
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
		// expect(violations).toStrictEqual([]); // previous
	});
});

describe('sizes=auto on img requires loading=lazy', () => {
	test('[sizes-auto-requires-lazy-loading-invalid-001] sizes=auto without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 1024w" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('auto');
	});

	test('[sizes-auto-requires-lazy-loading-invalid-002] sizes=auto with loading=eager → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="eager" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-valid-007] sizes=auto with loading=lazy → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="lazy" src="l.png" alt="p">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-invalid-003] sizes="auto, 100vw" without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w" sizes="auto, 100vw" src="s.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-valid-008] sizes="100vw, auto" (auto not first) → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="100vw, auto" loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-invalid-004] sizes=AUTO (uppercase) without loading → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="AUTO" src="s.png" alt="p">');
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-valid-009] sizes=" auto " (whitespace) with loading=lazy → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes=" auto " loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});
});

describe('sizes=auto on source requires sibling img[loading=lazy]', () => {
	test('[sizes-auto-requires-lazy-loading-invalid-005] source[sizes=auto] + img without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('auto');
	});

	test('[sizes-auto-requires-lazy-loading-invalid-006] source[sizes=auto] + img[loading=eager] → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="eager" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-valid-010] source[sizes=auto] + img[loading=lazy] → no violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="lazy" alt="p"></picture>',
		);
		// Behavior change: the img allows auto-sizes only with loading="lazy" and sizes="auto"
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
		// expect(violations).toStrictEqual([]); // previous
	});

	test('[sizes-auto-requires-lazy-loading-invalid-007] source[sizes=auto] with no following img → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><source srcset="s.webp 480w" sizes="auto"></picture>');
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-valid-011] source + source + img[loading=lazy] → no violation', async () => {
		// The escape checks the *following img*, not the immediately next sibling.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="a.webp 480w" sizes="auto" media="(min-width: 600px)"><source srcset="b.jpg 480w"><img src="b.jpg" loading="lazy" alt="p"></picture>',
		);
		// Behavior change: the img allows auto-sizes only with loading="lazy" and sizes="auto"
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
		// expect(violations).toStrictEqual([]); // previous
	});
});

describe('Edge cases', () => {
	test('[sizes-auto-requires-lazy-loading-invalid-008] w + x mixing with sizes=auto → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-invalid-009] rule disabled → no violations', async () => {
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

	test('[sizes-auto-requires-lazy-loading-valid-012] source[sizes=auto] + img[loading=lazy][sizes=auto] → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<picture>${source}<img src="s.jpg" srcset="s.jpg 480w" loading="lazy" sizes="auto" alt="p"></picture>`,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-013] sizes "AUTO, 100vw" on the img → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					`<picture>${source}<img src="s.jpg" loading="LAZY" sizes="AUTO, 100vw" alt="p"></picture>`,
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-014] sizes="auto 100vw" is not auto: nothing to require', async () => {
		// HTML LS § allows-auto-sizes: the value is "auto" or starts with "auto,".
		expect(
			(await mlRuleTest(rule, '<img srcset="a.png 480w" sizes="auto 100vw" src="a.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-015] img[sizes=auto] with loading="LAZY" (ASCII case-insensitive) → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="a.png 480w" sizes="auto" loading="LAZY" src="a.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-016] sizes=" auto " (not trimmed) is not auto, even without loading=lazy', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="a.png 480w" sizes=" auto " src="a.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-017] source[sizes="auto 100vw"] is not auto: the following img is not checked', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w" sizes="auto 100vw"><img src="s.jpg" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-invalid-010] img[sizes=auto] without loading=lazy → the loading message', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<picture>${source}<img src="s.jpg" loading="eager" sizes="auto" alt="p"></picture>`,
		);
		expect(violations.map(v => v.message)).toStrictEqual([LOADING]);
	});

	test('[sizes-auto-requires-lazy-loading-invalid-011] img[loading=lazy][sizes=100vw] → the sizes message', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<picture>${source}<img src="s.jpg" loading="lazy" sizes="100vw" alt="p"></picture>`,
		);
		expect(violations.map(v => v.message)).toStrictEqual([SIZES]);
	});

	test('[sizes-auto-requires-lazy-loading-invalid-012] img without loading and without sizes=auto → both are named', async () => {
		const { violations } = await mlRuleTest(rule, `<picture>${source}<img src="s.jpg" alt="p"></picture>`);
		expect(violations.map(v => v.message)).toStrictEqual([BOTH]);
	});

	test('[sizes-auto-requires-lazy-loading-invalid-013] source[sizes=auto] with no following img → the loading message', async () => {
		const { violations } = await mlRuleTest(rule, `<picture>${source}</picture>`);
		expect(violations.map(v => v.message)).toStrictEqual([LOADING]);
	});

	test('[sizes-auto-requires-lazy-loading-parser-001] Vue dynamic loading on the img → no violation', async () => {
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

	test('[sizes-auto-requires-lazy-loading-parser-002] Vue dynamic loading on img[sizes=auto] → no violation', async () => {
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

	test('[sizes-auto-requires-lazy-loading-parser-003] Vue dynamic sizes on the img → no violation', async () => {
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

	test('[sizes-auto-requires-lazy-loading-parser-004] Vue dynamic loading with a known sizes that is not auto → the sizes message', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<template><picture>${source}<img src="s.jpg" alt="p" :loading="l" sizes="100vw"></picture></template>`,
			vue,
		);
		expect(violations.map(v => v.message)).toStrictEqual([SIZES]);
	});

	test('[sizes-auto-requires-lazy-loading-parser-005] JSX spread props on the img → no violation', async () => {
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
