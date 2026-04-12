import type { Attribute } from '../types/index.js';

import { describe, test, expect } from 'vitest';

import { isConditionalAttributeTypeArray } from './is-conditional-attribute-type.js';

describe('isConditionalAttributeTypeArray (#3685)', () => {
	describe('positive cases', () => {
		test('returns true for a single ConditionalAttributeType entry', () => {
			const type: Attribute['type'] = [{ condition: "[type='color' i]", type: "<'color'>" }];
			expect(isConditionalAttributeTypeArray(type)).toBe(true);
		});

		test('returns true for multiple ConditionalAttributeType entries', () => {
			const type: Attribute['type'] = [
				{ condition: "[type='color' i]", type: "<'color'>" },
				{ condition: "[type='url' i]", type: 'URL' },
				{ condition: "[type='number' i]", type: [{ type: 'integer' }] },
			];
			expect(isConditionalAttributeTypeArray(type)).toBe(true);
		});

		test('narrows the type parameter to ConditionalAttributeType[] (compile-time check)', () => {
			const type: Attribute['type'] = [{ condition: "[type='color' i]", type: "<'color'>" }];
			if (isConditionalAttributeTypeArray(type)) {
				// If narrowing is correct, accessing `.condition` without extra guards compiles.
				expect(type[0]?.condition).toBe("[type='color' i]");
			} else {
				throw new Error('Expected narrowing to succeed');
			}
		});
	});

	describe('negative cases — scalar AttributeType', () => {
		test('returns false for a single string AttributeType', () => {
			expect(isConditionalAttributeTypeArray('URL')).toBe(false);
		});

		test('returns false for a Boolean AttributeType', () => {
			expect(isConditionalAttributeTypeArray('Boolean')).toBe(false);
		});
	});

	describe('negative cases — AttributeType array', () => {
		test('returns false for a tuple of string AttributeTypes', () => {
			expect(isConditionalAttributeTypeArray(['URL', 'Any'])).toBe(false);
		});

		test('returns false for a single-element string-only array', () => {
			expect(isConditionalAttributeTypeArray(['Any'])).toBe(false);
		});

		test('returns false for an array containing an Enum object', () => {
			const type: Attribute['type'] = [{ enum: ['on', 'off'] }];
			expect(isConditionalAttributeTypeArray(type)).toBe(false);
		});

		test('returns false for an array containing a Number object', () => {
			const type: Attribute['type'] = [{ type: 'integer', gte: 0 }];
			expect(isConditionalAttributeTypeArray(type)).toBe(false);
		});

		test('returns false for an array containing a List object', () => {
			const type: Attribute['type'] = [{ token: 'Any', separator: 'space' }];
			expect(isConditionalAttributeTypeArray(type)).toBe(false);
		});

		test('returns false for an array containing a Directive object', () => {
			const type: Attribute['type'] = [{ directive: ['find '], token: '<complex-selector-list>' }];
			expect(isConditionalAttributeTypeArray(type)).toBe(false);
		});
	});

	describe('edge cases', () => {
		test('returns false for an empty array', () => {
			expect(isConditionalAttributeTypeArray([])).toBe(false);
		});
	});
});
