import { describe, expect, test } from 'vitest';

import { Parser } from './parser.js';

class TestParser extends Parser {}

describe('Parser#attrExpressionLanguage', () => {
	test('is absent by default', () => {
		expect(new TestParser().attrExpressionLanguage).toBeUndefined();
	});

	test('is what the option says', () => {
		expect(new TestParser({ attrExpressionLanguage: 'javascript' }).attrExpressionLanguage).toBe('javascript');
	});
});

describe('Parser#templateContent', () => {
	test('is absent by default', () => {
		expect(new TestParser().templateContent).toBeUndefined();
	});

	test('is what the option says', () => {
		expect(new TestParser({ templateContent: 'in-place' }).templateContent).toBe('in-place');
	});
});

describe('Parser#literalValues', () => {
	test('is absent by default', () => {
		expect(new TestParser().literalValues).toBeUndefined();
	});

	test('is what the option says', () => {
		const literalValues = {
			booleanAttrs: { '""': null },
			attrs: { download: { true: '', false: null } },
			customElements: { otherAttrs: { true: '' } },
		};
		expect(new TestParser({ literalValues }).literalValues).toStrictEqual(literalValues);
	});
});
