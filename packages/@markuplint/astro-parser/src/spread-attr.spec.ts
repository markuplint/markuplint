import { describe, test, expect } from 'vitest';

import { extractSpreadAttribute, findMatchingBrace } from './spread-attr.js';

describe('findMatchingBrace', () => {
	test('returns -1 when start char is not `{`', () => {
		expect(findMatchingBrace('foo', 0)).toBe(-1);
	});

	test('matches simple `{...x}`', () => {
		expect(findMatchingBrace('{...x}', 0)).toBe(5);
	});

	test('matches nested object literal `{...{ a: 1 }}`', () => {
		const raw = '{...{ a: 1 }}';
		expect(findMatchingBrace(raw, 0)).toBe(raw.length - 1);
	});

	test('respects double-quoted string containing `}`', () => {
		const raw = '{...{ s: "}" }}';
		expect(findMatchingBrace(raw, 0)).toBe(raw.length - 1);
	});

	test('respects single-quoted string containing `}`', () => {
		const raw = "{...{ s: '}' }}";
		expect(findMatchingBrace(raw, 0)).toBe(raw.length - 1);
	});

	test('respects template literal `${expr}` interpolation', () => {
		const raw = '{...{ s: `${a}}` }}';
		expect(findMatchingBrace(raw, 0)).toBe(raw.length - 1);
	});

	test('respects line comment containing `}`', () => {
		const raw = '{...x // }\n}';
		expect(findMatchingBrace(raw, 0)).toBe(raw.length - 1);
	});

	test('respects block comment containing `}`', () => {
		const raw = '{...x /* } */ }';
		expect(findMatchingBrace(raw, 0)).toBe(raw.length - 1);
	});

	test('does not advance past intended `}` for HTML siblings', () => {
		// Only the spread itself; the `>{label}</div>` part is HTML and must stay outside.
		const raw = '{...props}>{label}</div>';
		expect(findMatchingBrace(raw, 0)).toBe(9);
	});

	test('returns -1 when braces are unbalanced', () => {
		expect(findMatchingBrace('{...{ a: 1 }', 0)).toBe(-1);
	});

	test('matches when start index is non-zero', () => {
		const raw = 'prefix {...x}';
		expect(findMatchingBrace(raw, 7)).toBe(12);
	});

	test('treats `\\\\"` as escaped-backslash followed by string-closing quote', () => {
		// String content is one backslash, then the `"` closes the string.
		// Even count of preceding backslashes => quote is NOT escaped.
		const raw = '{...{ s: "\\\\" }}';
		expect(findMatchingBrace(raw, 0)).toBe(raw.length - 1);
	});

	test('treats `\\"` as escaped quote that does not close the string', () => {
		// Odd count of preceding backslashes => quote IS escaped.
		const raw = '{...{ s: "a\\"b" }}';
		expect(findMatchingBrace(raw, 0)).toBe(raw.length - 1);
	});
});

describe('extractSpreadAttribute', () => {
	test('returns null for non-spread token', () => {
		expect(extractSpreadAttribute(' foo="bar"')).toBeNull();
		expect(extractSpreadAttribute(' {name}')).toBeNull();
	});

	test('extracts simple spread', () => {
		expect(extractSpreadAttribute(' {...props}')).toEqual({
			leadingSpace: ' ',
			spreadRaw: '{...props}',
			leftover: '',
		});
	});

	test('preserves leftover HTML after spread', () => {
		expect(extractSpreadAttribute(' {...props}>{label}</div>')).toEqual({
			leadingSpace: ' ',
			spreadRaw: '{...props}',
			leftover: '>{label}</div>',
		});
	});

	test('handles TypeScript assertion inside spread', () => {
		expect(extractSpreadAttribute(' {...{ command: "close" } as any} commandfor="dialog-id">')).toEqual({
			leadingSpace: ' ',
			spreadRaw: '{...{ command: "close" } as any}',
			leftover: ' commandfor="dialog-id">',
		});
	});

	test('handles conditional spread expression', () => {
		expect(extractSpreadAttribute(' {...c ? { x: 1 } : {}}>{value}')).toEqual({
			leadingSpace: ' ',
			spreadRaw: '{...c ? { x: 1 } : {}}',
			leftover: '>{value}',
		});
	});

	test('handles multi-line leading whitespace', () => {
		const result = extractSpreadAttribute('\n  {...rest}\n');
		expect(result).toEqual({
			leadingSpace: '\n  ',
			spreadRaw: '{...rest}',
			leftover: '\n',
		});
	});
});
