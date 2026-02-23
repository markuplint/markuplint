import { mlTest } from 'markuplint';
import { describe, test, expect } from 'vitest';

describe('multi-pass fix', () => {
	test('no overlap (single pass resolves all)', async () => {
		const { fixedCode } = await mlTest(
			"<DIV CLASS='a'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div CLASS="a"></div>');
	});

	test('overlap resolved in multi-pass', async () => {
		const { fixedCode } = await mlTest(
			"<DIV DATA-FOO='val'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div data-foo="val"></div>');
	});

	test('fix produces no changes on valid code', async () => {
		const { fixedCode } = await mlTest(
			'<div></div>',
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
				},
			},
			undefined,
			'en',
			true,
		);
		expect(fixedCode).toBe('<div></div>');
	});

	test('5+ rules applied together (overlap only, no cascading)', async () => {
		const { fixedCode } = await mlTest(
			"<DIV CLASS='a' CLASS='b' DATA-FOO='val'></DIV>",
			{
				rules: {
					'case-sensitive-tag-name': true,
					'case-sensitive-attr-name': true,
					'attr-value-quotes': true,
					'attr-duplication': true,
				},
			},
			undefined,
			'en',
			true,
		);
		// Tag name lowered, attr names lowered, quotes normalized, duplicate removed
		expect(fixedCode).toBe('<div class="a" data-foo="val"></div>');
	});
});
