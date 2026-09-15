import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('No violations', () => {
	test('[no-unpaired-srcset-sizes-valid-001] element without srcset is ignored', async () => {
		expect((await mlRuleTest(rule, '<img src="image.png" alt="photo">')).violations).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-valid-002] source outside picture is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<video><source src="video.mp4" type="video/mp4"></video>')).violations,
		).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-valid-003] w descriptors and sizes → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="(max-width: 600px) 480px, 1024px" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-valid-004] x descriptors only, no sizes → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">'))
				.violations,
		).toStrictEqual([]);
	});
});

describe('Sizes present requires width descriptors', () => {
	test('[no-unpaired-srcset-sizes-invalid-001] sizes + x descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="image-1x.png 1x, image-2x.png 2x" sizes="100vw" src="image-1x.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('image-1x.png 1x, image-2x.png 2x');
	});

	test('[no-unpaired-srcset-sizes-invalid-002] sizes + no descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="image.png" sizes="100vw" src="image.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
	});

	test('[no-unpaired-srcset-sizes-valid-005] sizes + mixed w and no-descriptor → no violation (hasWidth is true)', async () => {
		// The descriptor-mixing itself is `no-mixed-srcset-descriptors`'s concern; from this
		// rule's perspective, the srcset has a width descriptor, so the sizes/width pairing is
		// satisfied.
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png" sizes="100vw" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-invalid-003] source element: sizes + x descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="p.webp 1x, p2.webp 2x" sizes="100vw"><img src="p.jpg" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
	});
});

describe('Width descriptors require sizes', () => {
	test('[no-unpaired-srcset-sizes-invalid-004] w descriptors without sizes → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">');
	});

	test('[no-unpaired-srcset-sizes-invalid-005] w + x mixing without sizes → violation (pairing check fires regardless of mixing)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png 2x" src="small.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
	});

	test('[no-unpaired-srcset-sizes-invalid-006] w + no-descriptor mixing without sizes → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png" src="small.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
	});

	test('[no-unpaired-srcset-sizes-valid-006] w descriptors with sizes → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="l.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-valid-007] x descriptors without sizes → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-valid-008] no descriptor without sizes → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="p">')).violations).toStrictEqual(
			[],
		);
	});

	test('[no-unpaired-srcset-sizes-invalid-007] source with w descriptors without sizes (sibling img not lazy) → fires', async () => {
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

	test('[no-unpaired-srcset-sizes-valid-009] source with w descriptors without sizes (sibling img lazy) → no violation', async () => {
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
	test('[no-unpaired-srcset-sizes-valid-010] empty srcset value → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="" src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-valid-011] whitespace-only srcset → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="   " src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-valid-012] extra whitespace in srcset value → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="  s.png   480w  ,  l.png   1024w  " sizes="100vw" src="l.png" alt="p">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-invalid-008] picture with one valid and one invalid source', async () => {
		const { violations } = await mlRuleTest(
			rule,
			`<picture>
  <source srcset="a.webp 480w, b.webp 1024w" sizes="100vw" media="(min-width: 600px)">
  <source srcset="a.jpg 1x, b.jpg 2x" sizes="100vw">
  <img src="a.jpg" alt="p">
</picture>`,
		);
		// First source is valid (width descriptors + sizes); second source has sizes but only
		// density descriptors.
		expect(violations.length).toBe(1);
		expect(violations[0]?.line).toBe(3);
	});

	test('[no-unpaired-srcset-sizes-valid-013] sizes=auto with mixed descriptors but sizes present → no violation', async () => {
		// The mixing itself and the sizes=auto/loading pairing are other rules' concerns; from
		// this rule's perspective, sizes is present and the srcset has a width descriptor.
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[no-unpaired-srcset-sizes-invalid-009] rule disabled → no violations', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">', {
					rule: false,
				})
			).violations,
		).toStrictEqual([]);
	});
});

describe('Dynamic values', () => {
	test('[no-unpaired-srcset-sizes-parser-001] Vue dynamic srcset → no violation', async () => {
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

	test('[no-unpaired-srcset-sizes-parser-002] Vue dynamic sizes → no violation', async () => {
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

	test('[no-unpaired-srcset-sizes-parser-003] JSX spread props → no violation', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img {...props} srcset="s.png 480w" src="s.png" alt="p" />', {
					parser: { '.*': '@markuplint/jsx-parser' },
				})
			).violations,
		).toStrictEqual([]);
	});
});
