import { describe, expect, test } from 'vitest';

import { encodeSpec, type SpecLike } from './encode.ts';
import { VARIANTS } from './format.ts';
import { lazy, refOf } from './lazy.ts';

const SPEC: SpecLike = {
	def: {
		'#globalAttrs': { '#HTMLGlobalAttrs': { id: { type: 'DOMID' }, class: { type: 'Any', experimental: true } } },
		'#aria': {},
		'#contentModels': { '#flow': ['a', 'b'] },
	},
	specs: [{ name: 'a', attributes: { x: { type: 'Any' } } }],
	acceptedAttrNames: ['x', 'y'],
};

describe.each(VARIANTS)('a lazy value (%o)', variant => {
	const packed = encodeSpec(SPEC, variant);
	const region = packed.regions[1];
	if (!region) {
		throw new Error('no region');
	}
	const root = lazy(packed, region, region.root) as Record<string, Record<string, unknown>>;

	test('reads like the object that it stands for: keys, a spread, JSON', () => {
		const plain = SPEC.def?.['#globalAttrs'] as Record<string, unknown>;
		expect(Object.keys(root)).toStrictEqual(Object.keys(plain));
		expect({ ...root }).toStrictEqual(plain);
		// eslint-disable-next-line unicorn/prefer-structured-clone -- a Proxy cannot be cloned; its JSON is what is asked
		expect(JSON.parse(JSON.stringify(root))).toStrictEqual(plain);
		expect('#HTMLGlobalAttrs' in root).toBe(true);
		expect('nope' in root).toBe(false);
		expect(Object.hasOwn(root, '#HTMLGlobalAttrs')).toBe(true);
		expect(root.nope).toBeUndefined();
	});

	test('has what every object has, as an object that is made of the data has', () => {
		/* eslint-disable no-prototype-builtins -- the method that every object has is what is tested */
		expect(root.hasOwnProperty('#HTMLGlobalAttrs')).toBe(true);
		expect(root.hasOwnProperty('nope')).toBe(false);
		/* eslint-enable no-prototype-builtins */
		expect(String(root)).toBe('[object Object]');
		expect(root.constructor).toBe(Object);
	});

	test('is one object for one node', () => {
		expect(root['#HTMLGlobalAttrs']).toBe(root['#HTMLGlobalAttrs']);
		expect(lazy(packed, region, region.root)).toBe(root);
	});

	test('is a reference to its node, and a number, a boolean, null and a string are not', () => {
		expect(refOf(root)).toStrictEqual({ region, node: region.root });
		const group = root['#HTMLGlobalAttrs'] as Record<string, Record<string, unknown>>;
		expect(refOf(group)?.region).toBe(region);
		expect(refOf(group.id)?.node).toBeGreaterThan(-1);
		expect(refOf(group.id?.type)).toBeUndefined();
		expect(refOf({})).toBeUndefined();
		expect(refOf(null)).toBeUndefined();
		expect(refOf('text')).toBeUndefined();
	});

	test('is read-only', () => {
		expect(() => {
			root.x = {};
		}).toThrow('read-only');
		expect(() => {
			delete root['#HTMLGlobalAttrs'];
		}).toThrow('read-only');
	});

	test('is an array that an array method reads', () => {
		const rest = packed.regions[4];
		if (!rest) {
			throw new Error('no region');
		}
		const object = lazy(packed, rest, rest.root) as { acceptedAttrNames: string[] };
		const names = object.acceptedAttrNames;
		expect(Array.isArray(names)).toBe(true);
		expect(names.length).toBe(2);
		expect([...names]).toStrictEqual(['x', 'y']);
		expect(names.map(name => name.toUpperCase())).toStrictEqual(['X', 'Y']);
		expect(names.indexOf('y')).toBe(1);
		expect(names[5]).toBeUndefined();
		expect(1 in names).toBe(true);
		expect(5 in names).toBe(false);
		expect(Object.keys(names)).toStrictEqual(['0', '1']);
		expect([...names]).toStrictEqual(['x', 'y']);
		const seen: string[] = [];
		for (const name of names) {
			seen.push(name);
		}
		expect(seen).toStrictEqual(['x', 'y']);
	});

	test('is an array that cannot be written to by a method either', () => {
		const rest = packed.regions[4];
		if (!rest) {
			throw new Error('no region');
		}
		const names = (lazy(packed, rest, rest.root) as { acceptedAttrNames: string[] }).acceptedAttrNames;
		expect(() => names.push('z')).toThrow('read-only');
		expect(() => names.splice(0, 1)).toThrow('read-only');
		expect(() => {
			names[0] = 'z';
		}).toThrow('read-only');
	});

	test('is a plain value for a number, a boolean, null and a string', () => {
		const packedValues = encodeSpec(
			{ number: 7, yes: true, no: false, nothing: null, text: 'abc' } as SpecLike,
			variant,
		);
		const rest = packedValues.regions[4];
		if (!rest) {
			throw new Error('no region');
		}
		const read = (key: string) => lazy(packedValues, rest, packedValues.get(rest, rest.root, key));
		expect([read('number'), read('yes'), read('no'), read('nothing'), read('text')]).toStrictEqual([
			7,
			true,
			false,
			null,
			'abc',
		]);
		expect(refOf(read('text'))).toBeUndefined();
	});
});
