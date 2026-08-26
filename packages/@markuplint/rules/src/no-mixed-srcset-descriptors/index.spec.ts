import { mlRuleTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

import rule from './index.js';

describe('No violations', () => {
	test('[no-mixed-srcset-descriptors-valid-001] element without srcset is ignored', async () => {
		expect((await mlRuleTest(rule, '<img src="image.png" alt="photo">')).violations).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-valid-002] source outside picture is ignored', async () => {
		expect(
			(await mlRuleTest(rule, '<video><source src="video.mp4" type="video/mp4"></video>')).violations,
		).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-valid-003] x descriptors only → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="image-1x.png 1x, image-2x.png 2x" src="image-1x.png" alt="photo">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-valid-004] single URL srcset without descriptor → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="photo">')).violations,
		).toStrictEqual([]);
	});
});

describe('No mixing width and density descriptors', () => {
	test('[no-mixed-srcset-descriptors-invalid-001] w + x mixing → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png 2x" src="small.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
		expect(violations[0]?.raw).toBe('small.png 480w, large.png 2x');
	});

	test('[no-mixed-srcset-descriptors-invalid-002] w + no-descriptor mixing → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png" src="small.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
	});

	test('[no-mixed-srcset-descriptors-invalid-003] sizes + mixed w and no-descriptor → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="small.png 480w, large.png" sizes="100vw" src="large.png" alt="photo">',
		);
		expect(violations.length).toBe(1);
	});

	test('[no-mixed-srcset-descriptors-valid-005] all w → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 480w, l.png 1024w" sizes="100vw" src="s.png" alt="p">'))
				.violations,
		).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-valid-006] all x → no violation', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="s.png 1x, l.png 2x" src="s.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-valid-007] x + no-descriptor → no violation (both density)', async () => {
		expect(
			(await mlRuleTest(rule, '<img srcset="small.png, large.png 2x" src="small.png" alt="p">')).violations,
		).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-valid-008] all no-descriptor → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="image.png" src="image.png" alt="p">')).violations).toStrictEqual(
			[],
		);
	});

	test('[no-mixed-srcset-descriptors-invalid-004] w + x mixing with sizes=auto → violation', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img srcset="s.png 480w, l.png 2x" sizes="auto" src="l.png" alt="p">',
		);
		expect(violations.length).toBe(1);
	});
});

describe('Edge cases', () => {
	test('[no-mixed-srcset-descriptors-valid-009] empty srcset value → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="" src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-valid-010] whitespace-only srcset → no violation', async () => {
		expect((await mlRuleTest(rule, '<img srcset="   " src="image.png" alt="p">')).violations).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-invalid-005] rule disabled → no violations', async () => {
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
	test('[no-mixed-srcset-descriptors-parser-001] Vue dynamic srcset → no violation', async () => {
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

	test('[no-mixed-srcset-descriptors-parser-002] JSX expression srcset → no violation', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img srcset={srcsetValue} sizes="100vw" src="s.png" alt="p" />', {
					parser: { '.*': '@markuplint/jsx-parser' },
				})
			).violations,
		).toStrictEqual([]);
	});

	test('[no-mixed-srcset-descriptors-parser-003] JSX spread props → no violation', async () => {
		expect(
			(
				await mlRuleTest(rule, '<img {...props} srcset="s.png 480w" src="s.png" alt="p" />', {
					parser: { '.*': '@markuplint/jsx-parser' },
				})
			).violations,
		).toStrictEqual([]);
	});
});
