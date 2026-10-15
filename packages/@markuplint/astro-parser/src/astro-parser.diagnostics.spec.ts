import { ParserError } from '@markuplint/parser-utils';
import { describe, test, expect, vi } from 'vitest';

const result = vi.hoisted(() => ({
	ast: { type: 'AstroRoot', start: 0, end: 0, body: [], frontmatter: { start: 0, end: 0 } },
	diagnostics: [] as { severity: string; text: string; hint: string; labels: unknown[] }[],
}));

vi.mock('astro-eslint-parser', () => ({
	parseTemplate: () => ({ result }),
}));

const { astroParse } = await import('./astro-parser.js');

/**
 * The severity gate of `astroParse` is dead code against the real parser (it throws on errors
 * itself), so it is exercised here with a stand-in that reports the diagnostics.
 */
describe('diagnostics', () => {
	test('an error diagnostic is a parse error at its first label, with a 1-based column', () => {
		result.diagnostics = [
			{
				severity: 'error',
				text: 'Something is wrong',
				hint: '',
				labels: [{ text: null, start: 3, end: 4, line: 2, column: 4 }],
			},
		];
		const fn = () => astroParse('');
		expect(fn).toThrow(ParserError);
		expect(fn).toThrow('Something is wrong');
		expect(fn).toThrow(expect.objectContaining({ line: 2, col: 5 }));
	});

	test('an error diagnostic without a label is a parse error at line 1', () => {
		result.diagnostics = [{ severity: 'error', text: 'No label', hint: '', labels: [] }];
		expect(() => astroParse('')).toThrow(expect.objectContaining({ line: 1, col: 0 }));
	});

	test.each(['warning', 'information', 'hint'])('a %s diagnostic does not abort parsing', severity => {
		result.diagnostics = [{ severity, text: 'Not fatal', hint: '', labels: [] }];
		expect(() => astroParse('')).not.toThrow();
	});
});
