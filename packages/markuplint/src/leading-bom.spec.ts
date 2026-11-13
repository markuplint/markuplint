import { describe, test, expect } from 'vitest';

import { mlTest } from './testing-tool/index.js';

const DOCUMENT =
	'<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>t</title></head>\n<body>\n<p>x</p>\n</body>\n</html>\n';

describe('a leading BOM', () => {
	test('a document that starts with a BOM is as valid as the same document without it', async () => {
		const { violations } = await mlTest('\uFEFF' + DOCUMENT, { extends: ['markuplint:html-standard'] });
		expect(violations).toStrictEqual([]);
	});

	test('a violation on the first line is one column later, and the fix puts its edits after the BOM and keeps it', async () => {
		const { violations, fixedCode } = await mlTest(
			'\uFEFF<p class=a>x</p>',
			{ rules: { 'attr-value-quotes': true } },
			'en',
			true,
		);
		expect(violations).toStrictEqual([
			{
				severity: 'warning',
				message: 'Attribute value must be quoted with double quotation marks',
				line: 1,
				col: 5,
				raw: 'class=a',
				ruleId: 'attr-value-quotes',
				fix: {
					edits: [
						{ range: [10, 10], text: '"' },
						{ range: [11, 11], text: '"' },
					],
				},
			},
		]);
		expect(fixedCode).toBe('\uFEFF<p class="a">x</p>');
	});

	test('a comment directly inside the html element is as valid as one anywhere else', async () => {
		const { violations } = await mlTest(
			'<!doctype html>\n<html lang="en">\n<!-- c -->\n<head><meta charset="utf-8"><title>t</title></head>\n<!-- c -->\n<body>\n<p>x</p>\n</body>\n</html>\n',
			{ extends: ['markuplint:html-standard'] },
		);
		expect(violations).toStrictEqual([]);
	});
});
