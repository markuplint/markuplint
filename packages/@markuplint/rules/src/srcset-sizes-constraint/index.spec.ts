import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('No violations', () => {
	test('[srcset-sizes-constraint-invalid-001] srcset with x descriptors only, no sizes', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-002] srcset with w descriptors and sizes', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="(max-width: 600px) 480px, 1024px" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-003] sizes=auto with loading=lazy on img', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="auto" loading="lazy" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-004] sizes="auto, 100vw" with loading=lazy on img', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="auto, 100vw" loading="lazy" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-005] source[sizes=auto] with sibling img[loading=lazy]', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w, l.webp 1024w" sizes="auto"><img src="l.jpg" loading="lazy" alt="photo"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-006] source[sizes=auto] with non-adjacent sibling img[loading=lazy]', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="a.webp 480w" sizes="auto" type="image/webp"><source srcset="a.jpg 480w" sizes="100vw"><img src="a.jpg" loading="lazy" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-007] single URL srcset without descriptor or sizes', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="photo">')).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-valid-001] element without srcset is ignored', async () => {
		expect((await mlRuleTest(rule, '<img src="image.png" alt="photo">')).violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-008] source outside picture is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<video><source src="video.mp4" type="video/mp4"></video>')).violations,
		).toStrictEqual([]);
	});
});

describe('Check 1: sizes requires width descriptors in srcset', () => {
	test('[srcset-sizes-constraint-invalid-009] sizes + x descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="image-1x.png 1x, image-2x.png 2x" sizes="100vw" src="image-1x.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('image-1x.png 1x, image-2x.png 2x');
	});

	test('[srcset-sizes-constraint-invalid-010] sizes + no descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="image.png" sizes="100vw" src="image.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
	});

	test('[srcset-sizes-constraint-invalid-011] sizes + mixed w and no-descriptor → violation (also Check 2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png" sizes="100vw" src="large.png" alt="photo">',
		);
		// Check 2 fires for mixing, Check 1 does NOT fire because hasWidth is true
		expect(violations.length).toBe(1);
	});

	test('[srcset-sizes-constraint-invalid-012] source element: sizes + x descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="p.webp 1x, p2.webp 2x" sizes="100vw"><img src="p.jpg" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
	});
});

describe('Check 2: no mixing width and density descriptors', () => {
	test('[srcset-sizes-constraint-invalid-013] w + x mixing → violation (also Check 5: w without sizes)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png 2x" src="small.png" alt="photo">',
		);
		// Check 2 (mixing) + Check 5 (w descriptor without sizes)
		expect(violations.length).toBe(2);
		expect(violations[0]?.raw).toBe('small.png 480w, large.png 2x');
	});

	test('[srcset-sizes-constraint-invalid-014] w + no-descriptor mixing → violation (also Check 5: w without sizes)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png" src="small.png" alt="photo">',
		);
		// Check 2 (mixing) + Check 5 (w descriptor without sizes)
		expect(violations.length).toBe(2);
	});

	test('[srcset-sizes-constraint-invalid-015] all w → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-016] all x → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-017] x + no-descriptor → no violation (both density)', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="small.png, large.png 2x" src="small.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-018] all no-descriptor → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="p">')).violations).toStrictEqual(
			[],
		);
	});
});

describe('Check 3: sizes=auto on img requires loading=lazy', () => {
	test('[srcset-sizes-constraint-invalid-019] sizes=auto without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 1024w" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('auto');
	});

	test('[srcset-sizes-constraint-invalid-020] sizes=auto with loading=eager → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="eager" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('[srcset-sizes-constraint-invalid-021] sizes=auto with loading=lazy → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="lazy" src="l.png" alt="p">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-022] sizes="auto, 100vw" without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w" sizes="auto, 100vw" src="s.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('[srcset-sizes-constraint-invalid-023] sizes="100vw, auto" (auto not first) → no Check 3 violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="100vw, auto" loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-024] sizes=AUTO (uppercase) without loading → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="AUTO" src="s.png" alt="p">');
		expect(violations.length).toBe(1);
	});

	test('[srcset-sizes-constraint-invalid-025] sizes=" auto " (whitespace) with loading=lazy → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes=" auto " loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});
});

describe('Check 4: sizes=auto on source requires sibling img[loading=lazy]', () => {
	test('[srcset-sizes-constraint-invalid-026] source[sizes=auto] + img without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('auto');
	});

	test('[srcset-sizes-constraint-invalid-027] source[sizes=auto] + img[loading=eager] → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="eager" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
	});

	test('[srcset-sizes-constraint-invalid-028] source[sizes=auto] + img[loading=lazy] → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="lazy" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-029] source[sizes=auto] with no following img → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><source srcset="s.webp 480w" sizes="auto"></picture>');
		expect(violations.length).toBe(1);
	});

	test('[srcset-sizes-constraint-invalid-030] source + source + img[loading=lazy] → no violation', async () => {
		// The first source carries a non-always-matching media query so Check 6
		// (which fires when a srcset-bearing sibling follows) stays out of the
		// way; this test exercises only Check 4's lazy-img escape.
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="a.webp 480w" sizes="auto" media="(min-width: 600px)"><source srcset="b.jpg 480w"><img src="b.jpg" loading="lazy" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});
});

describe('Check 5: w descriptors on img require sizes attribute', () => {
	test('[srcset-sizes-constraint-invalid-031] w descriptors without sizes → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">');
	});

	test('[srcset-sizes-constraint-invalid-032] w descriptors with sizes → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="l.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-033] x descriptors without sizes → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-034] no descriptor without sizes → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="p">')).violations).toStrictEqual(
			[],
		);
	});

	test('[srcset-sizes-constraint-invalid-035] source with w descriptors without sizes (sibling img not lazy) → fires', async () => {
		// HTML LS § source: when srcset has width descriptors, sizes must be
		// present unless the following sibling img supports auto-sizes
		// (loading="lazy"). Here img has no loading attr so sizes is required.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w, l.webp 1024w"><img src="l.jpg" alt="p"></picture>',
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The "sizes" attribute is required when the "srcset" attribute uses width descriptors',
				raw: '<source srcset="s.webp 480w, l.webp 1024w">',
			},
		]);
	});

	test('[srcset-sizes-constraint-invalid-036] source with w descriptors without sizes (sibling img lazy) → no violation', async () => {
		// HTML LS § source: img with loading="lazy" supports auto-sizes, so
		// the source's sizes attribute may be omitted even with w descriptors.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w, l.webp 1024w"><img src="l.jpg" alt="p" loading="lazy"></picture>',
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('Check 6: always-matching source requires media or type', () => {
	test('[srcset-sizes-constraint-invalid-040] source without media/type followed by source with srcset → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-041] following source has srcset+media, current source still lacks media/type → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-042] following source has srcset+type, current source lacks media/type → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-043] following img has srcset, source lacks media/type → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-044] source with sizes but no media/type, following source with srcset → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-045] media="all" counts as no media → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-046] media="ALL" (uppercase) counts as no media → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-047] media=" all " (surrounding whitespace) counts as no media → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-048] empty media counts as no media → violation', async () => {
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

	test('[srcset-sizes-constraint-valid-004] source with qualifying media → no violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="(min-width: 600px)"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-valid-005] source with type → no violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" type="image/webp"><img src="z" srcset="y" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-valid-006] following img without srcset → no trigger → no violation', async () => {
		// The trigger requires the following sibling to have a srcset attribute.
		// A bare fallback <img> (no srcset) does not make the source ambiguous.
		const { violations } = await mlRuleTest(rule, '<picture><source srcset="x"><img src="z" alt=""></picture>');
		expect(violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-valid-007] last source before bare img → no violation', async () => {
		// First source has qualifying media; second source is followed only by a
		// srcset-less img, so neither source is ambiguous.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="(min-width: 600px)"><source srcset="y" media="(min-width: 400px)"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-050] media with tab-only whitespace counts as no media → violation', async () => {
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

	test('[srcset-sizes-constraint-invalid-051] two consecutive always-matching sources → two violations', async () => {
		// Both leading sources lack media/type and each has a following
		// srcset-bearing sibling, so each is reported independently.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x"><source srcset="y"><img src="z" srcset="w" alt=""></picture>',
		);
		expect(violations.length).toBe(2);
		expect(violations.map(v => v.raw)).toStrictEqual(['<source srcset="x">', '<source srcset="y">']);
	});

	test('[srcset-sizes-constraint-valid-008] media="all" rescued by a type attribute → no violation', async () => {
		// A type attribute alone satisfies the requirement even when media="all".
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="all" type="image/webp"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-valid-009] following source without srcset → no trigger → no violation', async () => {
		// The trigger requires the following sibling to specify srcset; a
		// srcset-less following source does not make the first source ambiguous.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x"><source media="screen"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-valid-010] NBSP-padded "all" keeps a distinguishing media query → no violation', async () => {
		// Only ASCII whitespace is stripped; NBSP (U+00A0) is not, so an NBSP-padded
		// "all" is neither empty nor an ASCII match for "all" and remains distinguishing.
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="x" media="\u00A0all\u00A0"><source srcset="y"><img src="z" alt=""></picture>',
		);
		expect(violations).toStrictEqual([]);
	});
});

describe('Edge cases', () => {
	test('[srcset-sizes-constraint-valid-002] empty srcset value → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="" src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-valid-003] whitespace-only srcset → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="   " src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-049] extra whitespace in srcset value → valid', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="  s.png   480w  ,  l.png   1024w  " sizes="100vw" src="l.png" alt="p">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-037] picture with one valid and one invalid source', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<picture>
  <source srcset="a.webp 480w, b.webp 1024w" sizes="100vw" media="(min-width: 600px)">
  <source srcset="a.jpg 1x, b.jpg 2x" sizes="100vw">
  <img src="a.jpg" alt="p">
</picture>`,
		);
		// First source is valid (media query + width descriptors + sizes); second
		// source only: Check 1 violation (sizes + x descriptors). The media query
		// on the first source keeps Check 6 from firing on it.
		expect(violations.length).toBe(1);
		expect(violations[0]?.line).toBe(3);
	});

	test('[srcset-sizes-constraint-invalid-038] multiple violations on same element', async () => {
		// Check 2 (w + x mixing) + Check 3 (sizes=auto without lazy)
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(2);
	});

	test('[srcset-sizes-constraint-invalid-039] rule disabled → no violations', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">', {
					rule: false,
				})
			).violations,
		).toStrictEqual([]);
	});
});

describe('Dynamic values', () => {
	test('[srcset-sizes-constraint-parser-001] Vue dynamic srcset → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><img :srcset="computedSrcset" sizes="100vw" src="s.png" alt="p"></template>',
					{ parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } },
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-parser-002] Vue dynamic sizes → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><img srcset="s.png 480w" :sizes="computedSizes" src="s.png" alt="p"></template>',
					{ parser: { '.*': '@markuplint/vue-parser' }, specs: { '.*': '@markuplint/vue-spec' } },
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-parser-003] JSX expression srcset → no violation', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img srcset={srcsetValue} sizes="100vw" src="s.png" alt="p" />', {
					parser: { '.*': '@markuplint/jsx-parser' },
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-parser-004] JSX spread props → no violation', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img {...props} srcset="s.png 480w" src="s.png" alt="p" />', {
					parser: { '.*': '@markuplint/jsx-parser' },
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-parser-005] Vue dynamic :media on always-matching source → no Check 6 violation', async () => {
		// A dynamic media value is unknown at lint time; assume it may be a
		// qualifying media query and skip the Check 6 report.
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

	test('[srcset-sizes-constraint-parser-006] Vue dynamic :type on always-matching source → no Check 6 violation', async () => {
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
