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
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="a.webp 480w" sizes="auto"><source srcset="b.jpg 480w"><img src="b.jpg" loading="lazy" alt="p"></picture>',
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

describe('Edge cases', () => {
	test('[srcset-sizes-constraint-valid-002] empty srcset value → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="" src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-valid-003] whitespace-only srcset → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="   " src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('[srcset-sizes-constraint-invalid-036] extra whitespace in srcset value → valid', async () => {
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
  <source srcset="a.webp 480w, b.webp 1024w" sizes="100vw">
  <source srcset="a.jpg 1x, b.jpg 2x" sizes="100vw">
  <img src="a.jpg" alt="p">
</picture>`,
		);
		// Second source only: Check 1 violation (sizes + x descriptors)
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
});
