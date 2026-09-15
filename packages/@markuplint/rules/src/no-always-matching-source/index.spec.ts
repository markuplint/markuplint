import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('No violations', () => {
	test('[no-always-matching-source-valid-001] source outside picture is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<video><source src="video.mp4" type="video/mp4"></video>')).violations,
		).toStrictEqual([]);
	});

	test('[no-always-matching-source-valid-002] img element is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">'))
				.violations,
		).toStrictEqual([]);
	});
});

describe('Always-matching source requires media or type', () => {
	test('[no-always-matching-source-invalid-001] source without media/type followed by source with srcset → violation', async () => {
		// HTML LS § source: a <source> with a following sibling <source> with
		// srcset must have a media (non-"all") and/or type attribute, otherwise
		// it always matches and shadows the following candidate.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-002] following source has srcset+media, current source still lacks media/type → violation', async () => {
		// The requirement is on the *current* source; a media attr on the
		// following sibling does not rescue the first source.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x"><source srcset="y" media="screen"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-003] following source has srcset+type, current source lacks media/type → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x"><source srcset="y" type="image/gif"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-004] following img has srcset, source lacks media/type → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x"><img src="z" srcset="y" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-005] source with sizes but no media/type, following source with srcset → violation', async () => {
		// sizes does not satisfy the requirement; only media/type do.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x 100w" sizes="50vw"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x 100w" sizes="50vw">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-006] media="all" counts as no media → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="all"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x" media="all">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-007] media="ALL" (uppercase) counts as no media → violation', async () => {
		// ASCII case-insensitive match for "all".
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="ALL"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x" media="ALL">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-008] media=" all " (surrounding whitespace) counts as no media → violation', async () => {
		// Leading/trailing ASCII whitespace is stripped before the "all" match.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media=" all "><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x" media=" all ">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-009] empty media counts as no media → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media=""><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x" media="">',
			},
		]);
	});

	test('[no-always-matching-source-valid-003] source with qualifying media → no violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="(min-width: 600px)"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-always-matching-source-valid-004] source with type → no violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" type="image/webp"><img src="z" srcset="y" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-always-matching-source-valid-005] following img without srcset → no trigger → no violation', async () => {
		// The trigger requires the following sibling to have a srcset attribute.
		// A bare fallback <img> (no srcset) does not make the source ambiguous.
		const { violations } = await mlRuleTest(rule, '<picture><source srcset="x"><img src="z" alt=""></picture>');
		expect(violations).toStrictEqual([]);
	});

	test('[no-always-matching-source-valid-006] last source before bare img → no violation', async () => {
		// First source has qualifying media; second source is followed only by a
		// srcset-less img, so neither source is ambiguous.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="(min-width: 600px)"><source srcset="y" media="(min-width: 400px)"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-always-matching-source-invalid-010] media with tab-only whitespace counts as no media → violation', async () => {
		// HTML LS strips ASCII whitespace (incl. TAB) before the "all" check.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="\tall\t"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source srcset="x" media="\tall\t">',
			},
		]);
	});

	test('[no-always-matching-source-invalid-011] two consecutive always-matching sources → two violations', async () => {
		// Both leading sources lack media/type and each has a following
		// srcset-bearing sibling, so each is reported independently.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x"><source srcset="y"><img src="z" srcset="w" alt=""></picture>',
		);
		expect(violations.length).toBe(2);
		expect(violations.map(v => v.raw)).toStrictEqual(['<source srcset="x">', '<source srcset="y">']);
	});

	test('[no-always-matching-source-valid-007] media="all" rescued by a type attribute → no violation', async () => {
		// A type attribute alone satisfies the requirement even when media="all".
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="all" type="image/webp"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-always-matching-source-valid-008] following source without srcset → no trigger → no violation', async () => {
		// The trigger requires the following sibling to specify srcset; a
		// srcset-less following source does not make the first source ambiguous.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x"><source media="screen"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-always-matching-source-valid-009] NBSP-padded "all" keeps a distinguishing media query → no violation', async () => {
		// Only ASCII whitespace is stripped; NBSP (U+00A0) is not, so an NBSP-padded
		// "all" is neither empty nor an ASCII match for "all" and remains distinguishing.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media=" all "><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-always-matching-source-invalid-012] srcset-less source without media/type before a srcset sibling → violation', async () => {
		// HTML LS applies the media/type requirement to any <source> with a
		// following srcset-bearing sibling, even one that has no srcset itself.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message:
					'The "source" element must have a "media" or "type" attribute when it has a following sibling "source" or "img" element with a "srcset" attribute',
				raw: '<source>',
			},
		]);
	});
});

describe('Edge cases', () => {
	test('[no-always-matching-source-invalid-013] rule disabled → no violations', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="x"><source srcset="y"><img src="z" alt=""></picture>',
					{
						rule: false,
					},
				)
			).violations,
		).toStrictEqual([]);
	});
});

describe('Dynamic values', () => {
	test('[no-always-matching-source-parser-001] Vue dynamic :media on always-matching source → no violation', async () => {
		// A dynamic media value is unknown at lint time; assume it may be a
		// qualifying media query and skip the report.
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><picture><source srcset="x" :media="mq"><source srcset="y"><img src="z" alt=""></picture></template>',
					{ parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } },
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[no-always-matching-source-parser-002] Vue dynamic :type on always-matching source → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><picture><source srcset="x" :type="mime"><source srcset="y"><img src="z" alt=""></picture></template>',
					{ parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } },
				)
			).violations,
		).toStrictEqual([]);
	});
});
