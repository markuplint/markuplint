import path from 'node:path';

import { mlRuleTest } from 'markuplint';
import { afterEach, describe, test, expect } from 'vitest';

import rule from './index.js';
import { _resetCacheForTesting } from './resolve-image-size.js';

const fixturesDir = path.resolve(import.meta.dirname, 'fixtures');

afterEach(() => {
	_resetCacheForTesting();
});

describe('Aspect ratio mismatch', () => {
	test('[no-mismatched-aspect-ratio-invalid-001] width/height do not match image aspect ratio', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<img src="/100x50.png" width="100" height="100">',
			},
		]);
	});

	test('[no-mismatched-aspect-ratio-valid-001] width/height match image aspect ratio (same dimensions)', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-002] width/height match image aspect ratio (scaled proportionally)', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="200" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-003] square image with matching dimensions', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/50x50.png" width="100" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-invalid-002] square image with mismatched dimensions', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/50x50.png" width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The aspect ratio of the image (50:50) does not match the width/height attributes (100:50)',
				raw: '<img src="/50x50.png" width="100" height="50">',
			},
		]);
	});
});

describe('Skip conditions', () => {
	test('[no-mismatched-aspect-ratio-valid-004] no src attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<img width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-005] no width attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-006] no height attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-007] remote URL (https)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="https://example.com/image.png" width="100" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-008] remote URL (http)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="http://example.com/image.png" width="100" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-009] data URI', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="data:image/png;base64,abc" width="100" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-010] non-img element is ignored', async () => {
		const { violations } = await mlRuleTest(rule, '<video src="/100x50.png" width="100" height="100"></video>', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('File not found', () => {
	test('[no-mismatched-aspect-ratio-valid-011] nonexistent image file', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/nonexistent.png" width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('documentRoot option', () => {
	test('[no-mismatched-aspect-ratio-invalid-003] resolves absolute path with documentRoot', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<img src="/100x50.png" width="100" height="100">',
			},
		]);
	});

	test('[no-mismatched-aspect-ratio-valid-012] without documentRoot, uses cwd (likely no fixture found)', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="100">');
		// File not found under cwd → no violation (silent skip)
		expect(violations).toStrictEqual([]);
	});
});

describe('Non-numeric width/height', () => {
	test('[no-mismatched-aspect-ratio-valid-013] width="auto" is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="auto" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-014] empty width is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-015] zero width is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="0" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Dynamic values', () => {
	test('[no-mismatched-aspect-ratio-parser-001] Vue dynamic src is skipped', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<template><img :src="imgSrc" width="100" height="100"></template>',
			{
				parser: { '.*': '@markuplint/vue-parser' },
				rule: { value: true, options: { documentRoot: fixturesDir } },
			},
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-parser-002] JSX spread props are skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img {...props} src="/100x50.png" width="100" height="100" />', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Multiple elements', () => {
	test('[no-mismatched-aspect-ratio-invalid-004] multiple img elements, only one mismatch', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="/100x50.png" width="100" height="50"><img src="/100x50.png" width="100" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 48,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<img src="/100x50.png" width="100" height="100">',
			},
		]);
	});

	test('[no-mismatched-aspect-ratio-invalid-005] same image referenced twice, both checked', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="/100x50.png" width="100" height="100"><img src="/100x50.png" width="200" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		// First img: mismatch, Second img: correct ratio
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<img src="/100x50.png" width="100" height="100">',
			},
		]);
	});
});

describe('Query strings and fragments', () => {
	test('[no-mismatched-aspect-ratio-invalid-006] src with query string still resolves the image file', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png?v=123" width="100" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<img src="/100x50.png?v=123" width="100" height="100">',
			},
		]);
	});

	test('[no-mismatched-aspect-ratio-invalid-007] src with fragment still resolves the image file', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/50x50.png#section" width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The aspect ratio of the image (50:50) does not match the width/height attributes (100:50)',
				raw: '<img src="/50x50.png#section" width="100" height="50">',
			},
		]);
	});

	test('[no-mismatched-aspect-ratio-invalid-008] same file with different query strings are both checked', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="/100x50.png?v=1" width="100" height="100"><img src="/100x50.png?v=2" width="200" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		// ?v=1: mismatch, ?v=2: correct ratio
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<img src="/100x50.png?v=1" width="100" height="100">',
			},
		]);
	});
});

describe('Edge cases', () => {
	test('[no-mismatched-aspect-ratio-valid-016] negative width is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="-10" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('picture/source element', () => {
	test('[no-mismatched-aspect-ratio-invalid-009] source with srcset mismatch', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="/100x50.png" width="100" height="100"></picture>',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<source srcset="/100x50.png" width="100" height="100">',
			},
		]);
	});

	test('[no-mismatched-aspect-ratio-valid-017] source with srcset match', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="/100x50.png" width="200" height="100"></picture>',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-valid-018] source inside video is skipped', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<video><source srcset="/100x50.png" width="100" height="100"></video>',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-invalid-010] source with multiple srcset entries', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="/100x50.png 1x, /50x50.png 2x" width="100" height="100"></picture>',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		// First image (100x50) is used for the check
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<source srcset="/100x50.png 1x, /50x50.png 2x" width="100" height="100">',
			},
		]);
	});

	test('[no-mismatched-aspect-ratio-valid-019] source without width/height', async () => {
		const { violations } = await mlRuleTest(rule, '<picture><source srcset="/100x50.png"></picture>', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-invalid-011] picture with img fallback (both checked)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<picture><source srcset="/100x50.png" width="100" height="100"><img src="/50x50.png" width="100" height="50"></picture>',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		// source: 100x50 vs 100:100 → mismatch; img: 50x50 vs 100:50 → mismatch
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 10,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (100:100)',
				raw: '<source srcset="/100x50.png" width="100" height="100">',
			},
			{
				severity: 'error',
				line: 1,
				col: 64,
				message: 'The aspect ratio of the image (50:50) does not match the width/height attributes (100:50)',
				raw: '<img src="/50x50.png" width="100" height="50">',
			},
		]);
	});
});

describe('Aspect ratio tolerance', () => {
	test('[no-mismatched-aspect-ratio-valid-021] mismatch of exactly 0.5px (rounding from an indivisible ratio) is within tolerance', async () => {
		// 100x50.png is a 2:1 ratio; width=301 divides to an exact height of 150.5,
		// so height=150 is off by exactly 0.5px — the boundary of the tolerance.
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="301" height="150">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('[no-mismatched-aspect-ratio-invalid-012] mismatch of more than 0.5px is still reported', async () => {
		// Same 301-wide image, but height=149 is off by 1.5px — genuinely wrong, not
		// just integer rounding.
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="301" height="149">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([
			{
				severity: 'error',
				line: 1,
				col: 1,
				message: 'The aspect ratio of the image (100:50) does not match the width/height attributes (301:149)',
				raw: '<img src="/100x50.png" width="301" height="149">',
			},
		]);
	});
});

describe('Rule disabled', () => {
	test('[no-mismatched-aspect-ratio-valid-020] no violations when rule is disabled', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="100">', {
			rule: false,
		});
		expect(violations).toStrictEqual([]);
	});
});
