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
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w, l.webp 1024w" sizes="auto"><img src="l.jpg" loading="lazy" alt="photo"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-valid-006] source[sizes=auto] with non-adjacent sibling img[loading=lazy]', async () => {
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="a.webp 480w" sizes="auto" type="image/webp"><source srcset="a.jpg 480w" sizes="100vw"><img src="a.jpg" loading="lazy" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
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
		expect(
			(
				await mlRuleTest(
					rule,
					'<picture><source srcset="s.webp 480w" sizes="auto"><img src="s.jpg" loading="lazy" alt="p"></picture>',
				)
			).violations,
		).toStrictEqual([]);
	});

	test('[sizes-auto-requires-lazy-loading-invalid-007] source[sizes=auto] with no following img → violation', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><source srcset="s.webp 480w" sizes="auto"></picture>');
		expect(violations.length).toBe(1);
	});

	test('[sizes-auto-requires-lazy-loading-valid-011] source + source + img[loading=lazy] → no violation', async () => {
		// The escape checks the *following img*, not the immediately next sibling.
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
