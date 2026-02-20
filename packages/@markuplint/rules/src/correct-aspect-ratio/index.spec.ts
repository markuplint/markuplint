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
	test('width/height do not match image aspect ratio', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toContain('100:50');
	});

	test('width/height match image aspect ratio (same dimensions)', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('width/height match image aspect ratio (scaled proportionally)', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="200" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('square image with matching dimensions', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/50x50.png" width="100" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('square image with mismatched dimensions', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/50x50.png" width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations.length).toBe(1);
		expect(violations[0]?.message).toBe(
			'The aspect ratio of the image (50:50) does not match the width/height attributes (100:50)',
		);
	});
});

describe('Skip conditions', () => {
	test('no src attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<img width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('no width attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('no height attribute', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('remote URL (https)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="https://example.com/image.png" width="100" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('remote URL (http)', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="http://example.com/image.png" width="100" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('data URI', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="data:image/png;base64,abc" width="100" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations).toStrictEqual([]);
	});

	test('non-img element is ignored', async () => {
		const { violations } = await mlRuleTest(rule, '<video src="/100x50.png" width="100" height="100"></video>', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('File not found', () => {
	test('nonexistent image file', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/nonexistent.png" width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('documentRoot option', () => {
	test('resolves absolute path with documentRoot', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations.length).toBe(1);
	});

	test('without documentRoot, uses cwd (likely no fixture found)', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="100">');
		// File not found under cwd → no violation (silent skip)
		expect(violations).toStrictEqual([]);
	});
});

describe('Non-numeric width/height', () => {
	test('width="auto" is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="auto" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('empty width is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});

	test('zero width is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="0" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Dynamic values', () => {
	test('Vue dynamic src is skipped', async () => {
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

	test('JSX spread props are skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img {...props} src="/100x50.png" width="100" height="100" />', {
			parser: { '.*': '@markuplint/jsx-parser' },
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Multiple elements', () => {
	test('multiple img elements, only one mismatch', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="/100x50.png" width="100" height="50"><img src="/100x50.png" width="100" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		expect(violations.length).toBe(1);
	});

	test('same image referenced twice, both checked', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="/100x50.png" width="100" height="100"><img src="/100x50.png" width="200" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		// First img: mismatch, Second img: correct ratio
		expect(violations.length).toBe(1);
	});
});

describe('Query strings and fragments', () => {
	test('src with query string still resolves the image file', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png?v=123" width="100" height="100">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations.length).toBe(1);
	});

	test('src with fragment still resolves the image file', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/50x50.png#section" width="100" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations.length).toBe(1);
	});

	test('same file with different query strings are both checked', async () => {
		const { violations } = await mlRuleTest(
			rule,
			'<img src="/100x50.png?v=1" width="100" height="100"><img src="/100x50.png?v=2" width="200" height="100">',
			{ rule: { value: true, options: { documentRoot: fixturesDir } } },
		);
		// ?v=1: mismatch, ?v=2: correct ratio
		expect(violations.length).toBe(1);
	});
});

describe('Edge cases', () => {
	test('negative width is skipped', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="-10" height="50">', {
			rule: { value: true, options: { documentRoot: fixturesDir } },
		});
		expect(violations).toStrictEqual([]);
	});
});

describe('Rule disabled', () => {
	test('no violations when rule is disabled', async () => {
		const { violations } = await mlRuleTest(rule, '<img src="/100x50.png" width="100" height="100">', {
			rule: false,
		});
		expect(violations).toStrictEqual([]);
	});
});
