/**
 * The values of a packed region as the objects and arrays that `schemaToSpec` reads, made when they are read.
 *
 * An array or an object of a region is a `Proxy` over its node: reading a key, an item, the keys (a spread, `Object.keys`)
 * or the length reads that part of the node and no more, and what it gives for an array or an object is a `Proxy` again.
 * A number, a boolean, null and a string are plain values. So a merge that reads a few elements of a region of hundreds
 * pays for those, and not for the rest.
 *
 * What the merge leaves as it was is still the `Proxy` when it comes back, and the encoder (`encode.ts`) takes it for the
 * node that it is, without looking into it: that is the sharing of the nodes of the base. What the merge makes (a spread is
 * a new object, `[...a]` a new array) is plain and is encoded as new nodes. A node is one object however many times it is
 * read, as it is in a tree of objects, and the `Proxy` is read-only: the merge never writes to what it is given.
 *
 * @module
 */
import type { PackedSpec, Region } from './read.ts';

import { NONE, Tag } from './format.ts';

/** The node of a region that a value stands for. */
export interface Reference {
	readonly region: Region;
	readonly node: number;
}

const REFERENCES = new WeakMap<object, Reference>();

/** The value that was made for a node, so that a node is one object as it is in a tree of objects (`a.b === a.b`). */
const MADE = new WeakMap<Region, Map<number, object>>();

function remembered(region: Region, node: number, make: () => object): object {
	let nodes = MADE.get(region);
	if (!nodes) {
		nodes = new Map();
		MADE.set(region, nodes);
	}
	let value = nodes.get(node);
	if (!value) {
		value = make();
		REFERENCES.set(value, { region, node });
		nodes.set(node, value);
	}
	return value;
}

/**
 * The node that a value stands for.
 *
 * @param value - Any value
 * @returns The reference when the value is an array or an object that was made by {@link lazy}, or `undefined`
 */
export function refOf(value: unknown): Reference | undefined {
	return typeof value === 'object' && value !== null ? REFERENCES.get(value) : undefined;
}

const INDEX = /^(?:0|[1-9]\d*)$/u;

function readOnly(): never {
	throw new TypeError('A value of a packed region is read-only');
}

/**
 * The value of a node.
 *
 * @param spec - The packed spec
 * @param region - The region
 * @param node - The node
 * @returns A plain value for a number, a boolean, null and a string, and a `Proxy` for an array and an object
 */
export function lazy(spec: PackedSpec, region: Region, node: number): unknown {
	switch (region.tag(node)) {
		case Tag.Null: {
			return null;
		}
		case Tag.False: {
			return false;
		}
		case Tag.True: {
			return true;
		}
		case Tag.Uint: {
			return region.a(node);
		}
		case Tag.String: {
			return spec.stringAt(region.a(node));
		}
		case Tag.Array: {
			return remembered(region, node, () => lazyArray(spec, region, node));
		}
		case Tag.Object: {
			return remembered(region, node, () => lazyObject(spec, region, node));
		}
		default: {
			throw new Error(`There is no tag ${region.tag(node)}`);
		}
	}
}

function lazyObject(spec: PackedSpec, region: Region, node: number): object {
	const count = region.b(node);
	/** The position of an entry among the entries of the object, or `NONE` for a key that the data lacks. */
	const positionOf = (key: string | symbol): number =>
		typeof key === 'string' ? spec.entry(region, node, key) : NONE;
	const valueAt = (position: number): unknown => lazy(spec, region, spec.valueAt(region, node, position));
	return new Proxy(
		{},
		{
			// what the data has, and then what every object has (`hasOwnProperty`, `toString`)
			get: (target, key, receiver) => {
				const position = positionOf(key);
				return position === NONE ? Reflect.get(target, key, receiver) : valueAt(position);
			},
			has: (_target, key) => positionOf(key) !== NONE,
			ownKeys: () =>
				Array.from({ length: count }, (_, position) => spec.stringAt(spec.keyAt(region, node, position))),
			getOwnPropertyDescriptor: (_target, key) => {
				const position = positionOf(key);
				return position === NONE
					? undefined
					: { value: valueAt(position), enumerable: true, configurable: true, writable: false };
			},
			set: readOnly,
			defineProperty: readOnly,
			deleteProperty: readOnly,
		},
	);
}

function lazyArray(spec: PackedSpec, region: Region, node: number): object {
	const count = region.b(node);
	const target: unknown[] = [];
	target.length = count;
	/** The position that a key names among the items, or `-1` for a key that is not one of them. */
	const positionOf = (key: string | symbol): number => {
		if (typeof key !== 'string' || !INDEX.test(key)) {
			return -1;
		}
		const position = Number(key);
		return position < count ? position : -1;
	};
	const itemAt = (position: number): unknown => lazy(spec, region, spec.at(region, node, position));
	return new Proxy(target, {
		get: (array, key, receiver) => {
			if (key === 'length') {
				return count;
			}
			const position = positionOf(key);
			return position === -1 ? Reflect.get(array, key, receiver) : itemAt(position);
		},
		has: (array, key) => positionOf(key) !== -1 || Reflect.has(array, key),
		ownKeys: () => [...Array.from({ length: count }, (_, position) => String(position)), 'length'],
		getOwnPropertyDescriptor: (array, key) => {
			const position = positionOf(key);
			if (position !== -1) {
				return { value: itemAt(position), enumerable: true, configurable: true, writable: false };
			}
			return Reflect.getOwnPropertyDescriptor(array, key);
		},
		set: readOnly,
		defineProperty: readOnly,
		deleteProperty: readOnly,
	});
}
