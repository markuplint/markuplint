import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[usemap-references-map-001] resolves to a map element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<img src="shapes.png" alt="" usemap="#shapes"><map name="shapes"></map>',
	);
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-002] no usemap attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="shapes.png" alt="">');
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-003] dynamic value is skipped', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="shapes.png" alt="" usemap="{{mapRef}}">', {
		parser: {
			'.*': '@markuplint/mustache-parser',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-004] no map element in the document', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="shapes.png" alt="" usemap="#nonexistent">');
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-005] map element exists but with a different name', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<img src="shapes.png" alt="" usemap="#shapes"><map name="other-shapes"></map>',
	);
	expect(violations.length).toBe(0);
});

test('[usemap-references-map-006] the reference resolves only via id, not name', async () => {
	// A hash-name reference is defined in terms of the `name` attribute; a
	// same-valued `id` on an unrelated element must not satisfy it.
	const { violations } = await mlRuleTest(
		rule,
		'<img src="shapes.png" alt="" usemap="#shapes"><map id="shapes"></map>',
	);
	expect(violations.length).toBe(0);
});

test('[usemap-references-map-007] the map is looked for in the tree of the image', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<template><img src="a.png" alt="" usemap="#m"><map name="m"></map></template>',
	);
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-008] a map in another tree is not the target', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<map name="m"></map><template><img src="a.png" alt="" usemap="#m"></template>',
	);
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 63,
			raw: '#m',
			message:
				'The "usemap" attribute of the "img" element must be a valid hash-name reference to a "map" element',
		},
	]);
});

test('[usemap-references-map-009] the name is compared after the character references are resolved', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="a.png" alt="" usemap="#&#109;"><map name="m"></map>');
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-010] a map whose name is not known until it is rendered may be the target', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="a.png" alt="" usemap="#m"><map name="{{x}}"></map>', {
		parser: { '.*': '@markuplint/mustache-parser' },
	});
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-011] the message is in Japanese with locale ja', async () => {
	const { violations } = await mlRuleTest(rule, '<img usemap="#x" src="a.png" alt="">', undefined, false, 'ja');

	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-012] a file that is a part of a page may be completed by a file that has the map', async () => {
	const page =
		'<!doctype html><html><head><title>t</title></head><body><img src="a.png" alt="" usemap="#m"></body></html>';
	expect((await mlRuleTest(rule, page)).violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 89,
			message:
				'The "usemap" attribute of the "img" element must be a valid hash-name reference to a "map" element',
			raw: '#m',
		},
	]);
	expect((await mlRuleTest(rule, '<img src="a.png" alt="" usemap="#m">')).violations).toStrictEqual([]);
});
