import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('No violations', () => {
	test('srcset with x descriptors only, no sizes', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">'))
				.violations,
		).toStrictEqual([]);
	});

	test('srcset with w descriptors and sizes', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="(max-width: 600px) 480px, 1024px" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('sizes=auto with loading=lazy on img', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="auto" loading="lazy" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('sizes="auto, 100vw" with loading=lazy on img', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="small.png 480w, large.png 1024w" sizes="auto, 100vw" loading="lazy" src="large.png" alt="photo">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('source[sizes=auto] with sibling img[loading=lazy]', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w, l.webp 1024w" sizes="auto"><img src="l.jpg" loading="lazy" alt="photo"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('source[sizes=auto] with non-adjacent sibling img[loading=lazy]', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="a.webp 480w" sizes="auto" type="image/webp"><source srcset="a.jpg 480w" sizes="100vw"><img src="a.jpg" loading="lazy" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('single URL srcset without descriptor or sizes', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="photo">')).violations,
		).toStrictEqual([]);
	});

	test('element without srcset is ignored', async () => {
		expect((await mlRuleTest(rule, '<img src="image.png" alt="photo">')).violations).toStrictEqual([]);
	});

	test('source outside picture is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<video><source src="video.mp4" type="video/mp4"></video>')).violations,
		).toStrictEqual([]);
	});
});

describe('Check 1: sizes requires width descriptors in srcset', () => {
	test('sizes + x descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="image-1x.png 1x, image-2x.png 2x" sizes="100vw" src="image-1x.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('image-1x.png 1x, image-2x.png 2x');
	});

	test('sizes + no descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="image.png" sizes="100vw" src="image.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
	});

	test('sizes + mixed w and no-descriptor → violation (also Check 2)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png" sizes="100vw" src="large.png" alt="photo">',
		);
		// Check 2 fires for mixing, Check 1 does NOT fire because hasWidth is true
		expect(violations.length).toBe(1);
	});

	test('source element: sizes + x descriptors → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="p.webp 1x, p2.webp 2x" sizes="100vw"><img src="p.jpg" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
	});
});

describe('Check 2: no mixing width and density descriptors', () => {
	test('w + x mixing → violation (also Check 5: w without sizes)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png 2x" src="small.png" alt="photo">',
		);
		// Check 2 (mixing) + Check 5 (w descriptor without sizes)
		expect(violations.length).toBe(2);
		expect(violations[0]?.raw).toBe('small.png 480w, large.png 2x');
	});

	test('w + no-descriptor mixing → violation (also Check 5: w without sizes)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png" src="small.png" alt="photo">',
		);
		// Check 2 (mixing) + Check 5 (w descriptor without sizes)
		expect(violations.length).toBe(2);
	});

	test('all w → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('all x → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('x + no-descriptor → no violation (both density)', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="small.png, large.png 2x" src="small.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('all no-descriptor → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="p">')).violations).toStrictEqual(
			[],
		);
	});
});

describe('Check 3: sizes=auto on img requires loading=lazy', () => {
	test('sizes=auto without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 1024w" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('auto');
	});

	test('sizes=auto with loading=eager → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="eager" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('sizes=auto with loading=lazy → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="s.png 480w, l.png 1024w" sizes="auto" loading="lazy" src="l.png" alt="p">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('sizes="auto, 100vw" without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w" sizes="auto, 100vw" src="s.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});

	test('sizes="100vw, auto" (auto not first) → no Check 3 violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="100vw, auto" loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('sizes=AUTO (uppercase) without loading → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<img srcset="s.png 480w" sizes="AUTO" src="s.png" alt="p">');
		expect(violations.length).toBe(1);
	});

	test('sizes=" auto " (whitespace) with loading=lazy → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w" sizes=" auto " loading="lazy" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});
});

describe('Check 4: sizes=auto on source requires sibling img[loading=lazy]', () => {
	test('source[sizes=auto] + img without loading → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('auto');
	});

	test('source[sizes=auto] + img[loading=eager] → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="eager" alt="p"></picture>',
		);
		expect(violations.length).toBe(1);
	});

	test('source[sizes=auto] + img[loading=lazy] → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="lazy" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('source[sizes=auto] with no following img → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><source srcset="s.webp 480w" sizes="auto"></picture>');
		expect(violations.length).toBe(1);
	});

	test('source + source + img[loading=lazy] → no violation', async () => {
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
	test('w descriptors without sizes → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('<img srcset="small.png 480w, large.png 1024w" src="large.png" alt="photo">');
	});

	test('w descriptors with sizes → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="l.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('x descriptors without sizes → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('no descriptor without sizes → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="p">')).violations).toStrictEqual(
			[],
		);
	});

	test('source with w descriptors without sizes → no Check 5 violation (spec says "may")', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w, l.webp 1024w"><img src="l.jpg" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});
});

describe('Edge cases', () => {
	test('empty srcset value → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="" src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('whitespace-only srcset → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="   " src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('extra whitespace in srcset value → valid', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<img srcset="  s.png   480w  ,  l.png   1024w  " sizes="100vw" src="l.png" alt="p">',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('picture with one valid and one invalid source', async () => {
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

	test('multiple violations on same element', async () => {
		// Check 2 (w + x mixing) + Check 3 (sizes=auto without lazy)
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(2);
	});

	test('rule disabled → no violations', async () => {
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
	test('Vue dynamic srcset → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><img :srcset="computedSrcset" sizes="100vw" src="s.png" alt="p"></template>',
					{ parser: { '.*': '@markuplint/vue-parser' } },
				)
			).violations,
		).toStrictEqual([]);
	});

	test('Vue dynamic sizes → no violation', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<template><img srcset="s.png 480w" :sizes="computedSizes" src="s.png" alt="p"></template>',
					{ parser: { '.*': '@markuplint/vue-parser' } },
				)
			).violations,
		).toStrictEqual([]);
	});

	test('JSX expression srcset → no violation', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img srcset={srcsetValue} sizes="100vw" src="s.png" alt="p" />', {
					parser: { '.*': '@markuplint/jsx-parser' },
				})
			).violations,
		).toStrictEqual([]);
	});

	test('JSX spread props → no violation', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img {...props} srcset="s.png 480w" src="s.png" alt="p" />', {
					parser: { '.*': '@markuplint/jsx-parser' },
				})
			).violations,
		).toStrictEqual([]);
	});
});
