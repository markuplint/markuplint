import type { CustomCssSyntax } from './types';

import { cssSyntaxMatch } from './css-syntax';

test('CSS Standard', () => {
	expect(cssSyntaxMatch('10px', '<length>').matched).toBe(true);
	expect(cssSyntaxMatch('one-pixel', '<length>').matched).toBe(false);
	expect(cssSyntaxMatch('(prefers-color-scheme: dark)', '<media-query-list>').matched).toBe(true);
});

test('Extends', () => {
	const sourceSizeList: CustomCssSyntax = {
		ref: 'https://html.spec.whatwg.org/multipage/images.html#sizes-attributes',
		syntax: {
			apply: '<source-size-list>',
			def: {
				'source-size-list': '[ <source-size># , ]? <source-size-value>',
				'source-size': '<media-condition> <source-size-value>',
				'source-size-value': '<length>',
			},
		},
	};
	expect(cssSyntaxMatch('50vw', sourceSizeList).matched).toBe(true);
	expect(cssSyntaxMatch('(max-width: 600px) 200px, 50vw', sourceSizeList).matched).toBe(true);
	expect(cssSyntaxMatch('print 300vw', sourceSizeList).matched).toBe(false);
	expect(cssSyntaxMatch('(max-width: 600px) 200px', sourceSizeList).matched).toBe(false);
	expect(
		cssSyntaxMatch('(max-width: 600px) 200px', {
			...sourceSizeList,
			syntax: {
				...sourceSizeList.syntax,
				apply: '<source-size>',
			},
		}).matched,
	).toBe(true);

	const keyTimes: CustomCssSyntax = {
		ref: 'https://svgwg.org/specs/animations/#KeyTimesAttribute',
		syntax: {
			apply: '<key-times>',
			def: {
				'key-times': '<number> [; <number>]* [;]?',
			},
		},
	};
	expect(cssSyntaxMatch('20; 20; 30', keyTimes).matched).toBe(true);
	expect(cssSyntaxMatch('20; 20; 30;', keyTimes).matched).toBe(true);
	expect(cssSyntaxMatch('20; 20; abc;', keyTimes).matched).toBe(false);
	expect(cssSyntaxMatch('20; 20; ;', keyTimes).matched).toBe(false);

	const SVGViewBox: CustomCssSyntax = {
		ref: 'https://svgwg.org/svg2-draft/coords.html#ViewBoxAttribute',
		syntax: {
			apply: '<view-box>',
			def: {
				'view-box': '<min-x> [,]? <min-y> [,]? <width> [,]? <height>',
				'min-x': '<number>',
				'min-y': '<number>',
				width: '<number>',
				height: '<number>',
			},
		},
	};
	expect(cssSyntaxMatch('0 0 30 10', SVGViewBox).matched).toBe(true);
	expect(cssSyntaxMatch('0 0, 30, 10', SVGViewBox).matched).toBe(true);
	expect(cssSyntaxMatch('0 0, 30', SVGViewBox).matched).toBe(false);

	const percentageList: CustomCssSyntax = {
		ref: 'https://developer.mozilla.org/en-US/docs/Web/SVG/Content_type#percentage',
		syntax: {
			apply: '<percentage-list>',
			def: {
				'percentage-list': '[ <number> [,]? ]* <number>',
			},
		},
	};
	expect(cssSyntaxMatch('0 0 30 10', percentageList).matched).toBe(true);
	expect(cssSyntaxMatch('0, 0, 30 10', percentageList).matched).toBe(true);
	expect(cssSyntaxMatch('0', percentageList).matched).toBe(true);
	expect(cssSyntaxMatch('', percentageList).matched).toBe(false);

	const custom: CustomCssSyntax = {
		ref: 'n/a',
		syntax: {
			apply: '<custom>',
			def: {
				custom: '0 | 1 | .',
			},
		},
	};
	expect(cssSyntaxMatch('0', custom).matched).toBe(true);
	expect(cssSyntaxMatch('1', custom).matched).toBe(true);
	expect(cssSyntaxMatch('.', custom).matched).toBe(true);
	expect(cssSyntaxMatch('2', custom).matched).toBe(false);
	expect(cssSyntaxMatch(':', custom).matched).toBe(false);
});

test('custom-type-checking', () => {
	const custom: CustomCssSyntax = {
		ref: 'n/a',
		caseSensitive: true,
		syntax: {
			apply: '<custom>',
			def: {
				custom: '<custom-type>',
				'custom-type': token => {
					if (!token) {
						return 0;
					}
					return token.value === '1' ? 1 : 0;
				},
			},
		},
	};
	expect(cssSyntaxMatch('1', custom).matched).toBe(true);
	expect(cssSyntaxMatch('0', custom).matched).toBe(false);
});

test('case-sensivite', () => {
	const custom: CustomCssSyntax = {
		ref: 'n/a',
		caseSensitive: true,
		syntax: {
			apply: '<custom>',
			def: {
				custom: 'CaSeS [a | B | aBc]',
			},
		},
	};
	expect(cssSyntaxMatch('CaSeS a', custom).matched).toBe(true);
	expect(cssSyntaxMatch('CaSeS B', custom).matched).toBe(true);
	expect(cssSyntaxMatch('CaSeS aBc', custom).matched).toBe(true);
	expect(cssSyntaxMatch('CaSeS A', custom)).toStrictEqual({
		column: 7,
		line: 1,
		matched: false,
		length: 1,
		offset: 6,
		partName: 'value',
		raw: 'A',
		reason: 'syntax-error',
		ref: 'n/a',
		expects: [
			{
				type: 'syntax',
				value: 'CaSeS [ a | B | aBc ]',
			},
		],
	});
	expect(cssSyntaxMatch('CaSeS abc', custom)).toStrictEqual({
		column: 7,
		line: 1,
		matched: false,
		length: 3,
		offset: 6,
		partName: 'value',
		raw: 'abc',
		reason: 'syntax-error',
		ref: 'n/a',
		expects: [
			{
				type: 'syntax',
				value: 'CaSeS [ a | B | aBc ]',
			},
		],
	});
});
