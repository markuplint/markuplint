import { mlRuleTest } from 'markuplint';
import { test, expect } from 'vitest';

import rule from './index.js';

test('[usemap-references-map-valid-001] resolves to a map element', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<img src="shapes.png" alt="" usemap="#shapes"><map name="shapes"></map>',
	);
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-valid-002] no usemap attribute', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="shapes.png" alt="">');
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-valid-003] dynamic value is skipped', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="shapes.png" alt="" usemap="{{mapRef}}">', {
		parser: {
			'.*': '@markuplint/mustache-parser',
		},
	});
	expect(violations).toStrictEqual([]);
});

test('[usemap-references-map-invalid-001] no map element in the document', async () => {
	const { violations } = await mlRuleTest(rule, '<img src="shapes.png" alt="" usemap="#nonexistent">');
	expect(violations).toStrictEqual([
		{
			severity: 'error',
			line: 1,
			col: 38,
			message:
				'The "usemap" attribute of the "img" element must be a valid hash-name reference to a "map" element',
			raw: '#nonexistent',
		},
	]);
});

test('[usemap-references-map-invalid-002] map element exists but with a different name', async () => {
	const { violations } = await mlRuleTest(
		rule,
		'<img src="shapes.png" alt="" usemap="#shapes"><map name="other-shapes"></map>',
	);
	expect(violations.length).toBe(1);
});

test('[usemap-references-map-invalid-003] the reference resolves only via id, not name', async () => {
	// A hash-name reference is defined in terms of the `name` attribute; a
	// same-valued `id` on an unrelated element must not satisfy it.
	const { violations } = await mlRuleTest(
		rule,
		'<img src="shapes.png" alt="" usemap="#shapes"><map id="shapes"></map>',
	);
	expect(violations.length).toBe(1);
});
