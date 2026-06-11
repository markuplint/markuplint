import { describe, test, expect } from 'vitest';

import { resolveAliases, expandConditionAliases } from './selector-aliases.ts';

describe('resolveAliases', () => {
	test('returns flat definitions as-is', () => {
		expect(resolveAliases({ '#Foo': '[a]', '#Bar': '[b]' })).toStrictEqual({
			'#Foo': '[a]',
			'#Bar': '[b]',
		});
	});

	test('resolves nested references', () => {
		expect(
			resolveAliases({
				'#Leaf': "[x='1'], [x='2']",
				'#Node': ':is(:not([x]), #Leaf)',
			}),
		).toStrictEqual({
			'#Leaf': "[x='1'], [x='2']",
			'#Node': ":is(:not([x]), [x='1'], [x='2'])",
		});
	});

	test('throws on an unknown reference', () => {
		expect(() => resolveAliases({ '#Node': ':is(#Missing)' })).toThrow('Unknown selector alias: #Missing');
	});

	test('throws on a circular reference', () => {
		expect(() => resolveAliases({ '#A': ':is(#B)', '#B': ':is(#A)' })).toThrow('Circular selector alias: #A');
	});
});

describe('expandConditionAliases', () => {
	const aliases = resolveAliases({
		'#Leaf': "[x='1'], [x='2']",
		'#Node': ':is(:not([x]), #Leaf)',
	});

	test('expands a string condition', () => {
		const attributes = {
			foo: {
				condition: '#Node[src]',
			},
		};
		expect(expandConditionAliases(attributes, aliases)).toStrictEqual({
			foo: {
				condition: ":is(:not([x]), [x='1'], [x='2'])[src]",
			},
		});
	});

	test('expands each item of an array condition', () => {
		const attributes = {
			foo: {
				condition: ['#Node[src]', "[x='3']"],
			},
		};
		expect(expandConditionAliases(attributes, aliases)).toStrictEqual({
			foo: {
				condition: [":is(:not([x]), [x='1'], [x='2'])[src]", "[x='3']"],
			},
		});
	});

	test('expands conditions inside ConditionalAttributeType entries', () => {
		const attributes = {
			foo: {
				type: [
					{ condition: '#Node', type: 'Any' },
					{ condition: "[x='3']", type: 'Any' },
				],
			},
		};
		expect(expandConditionAliases(attributes, aliases)).toStrictEqual({
			foo: {
				type: [
					{ condition: ":is(:not([x]), [x='1'], [x='2'])", type: 'Any' },
					{ condition: "[x='3']", type: 'Any' },
				],
			},
		});
	});

	test('leaves alias-free attributes untouched', () => {
		const attributes = {
			foo: {
				type: 'Any',
				condition: '[src]',
			},
			bar: {
				type: 'Boolean',
			},
		};
		expect(expandConditionAliases(attributes, aliases)).toStrictEqual(attributes);
	});

	test('throws on an unknown alias in a condition', () => {
		const attributes = {
			foo: {
				condition: '#Unknown[src]',
			},
		};
		expect(() => expandConditionAliases(attributes, aliases)).toThrow('Unknown selector alias: #Unknown');
	});

	test('does not treat lowercase ID selectors as aliases', () => {
		const attributes = {
			foo: {
				condition: '#someId [src]',
			},
		};
		expect(expandConditionAliases(attributes, aliases)).toStrictEqual(attributes);
	});
});
