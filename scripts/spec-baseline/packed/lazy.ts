/**
 * The values of a packed region as the objects and arrays that `schemaToSpec` reads, made when they are read.
 *
 * A composition that decoded the whole region to merge an extension into it paid for everything that the extension
 * does not touch (the elements of `specs`, the roles of the ARIA), which is most of it. Here an array or an object of a region is
 * a `Proxy` over its node: reading a key, an item, the keys (a spread, `Object.keys`) or the length reads that part
 * of the node and no more, and what it gives for an array or an object is a `Proxy` again. A number, a boolean, null and a string are
 * plain values.
 *
 * What the merge leaves as it was is then still the `Proxy` when it comes back, and the encoder (`encode.ts`) takes it for the node that
 * it is, without looking into it: that is the sharing of the nodes of the base. What the merge makes (a spread is a new object,
 * `[...a]` a new array) is plain and is encoded as new nodes. The `Proxy` is read-only: the merge never writes to what it
 * is given.
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
			return lazyArray(spec, region, node);
		}
		case Tag.Object: {
			return lazyObject(spec, region, node);
		}
		default: {
			throw new Error(`There is no tag ${region.tag(node)}`);
		}
	}
}

function lazyObject(spec: PackedSpec, region: Region, node: number): object {
	const count = region.b(node);
	const valueOf = (key: string | symbol): unknown => {
		if (typeof key !== 'string') {
			return undefined;
		}
		const position = spec.entry(region, node, key);
		return position === NONE ? undefined : lazy(spec, region, spec.valueAt(region, node, position));
	};
	const proxy = new Proxy(
		{},
		{
			get: (_target, key) => valueOf(key),
			has: (_target, key) => typeof key === 'string' && spec.entry(region, node, key) !== NONE,
			ownKeys: () =>
				Array.from({ length: count }, (_, position) => spec.stringAt(spec.keyAt(region, node, position))),
			getOwnPropertyDescriptor: (_target, key) => {
				if (typeof key !== 'string' || spec.entry(region, node, key) === NONE) {
					return;
				}
				return { value: valueOf(key), enumerable: true, configurable: true, writable: false };
			},
			set: readOnly,
			defineProperty: readOnly,
			deleteProperty: readOnly,
		},
	);
	REFERENCES.set(proxy, { region, node });
	return proxy;
}

function lazyArray(spec: PackedSpec, region: Region, node: number): object {
	const count = region.b(node);
	const target: unknown[] = [];
	target.length = count;
	const itemAt = (key: string | symbol): { found: boolean; value?: unknown } => {
		if (typeof key !== 'string' || !INDEX.test(key)) {
			return { found: false };
		}
		const position = Number(key);
		return position < count
			? { found: true, value: lazy(spec, region, spec.at(region, node, position)) }
			: { found: false };
	};
	const proxy = new Proxy(target, {
		get: (array, key, receiver) => {
			if (key === 'length') {
				return count;
			}
			const item = itemAt(key);
			return item.found ? item.value : Reflect.get(array, key, receiver);
		},
		has: (array, key) => itemAt(key).found || Reflect.has(array, key),
		ownKeys: () => [...Array.from({ length: count }, (_, position) => String(position)), 'length'],
		getOwnPropertyDescriptor: (array, key) => {
			const item = itemAt(key);
			if (item.found) {
				return { value: item.value, enumerable: true, configurable: true, writable: false };
			}
			return Reflect.getOwnPropertyDescriptor(array, key);
		},
		set: readOnly,
		defineProperty: readOnly,
		deleteProperty: readOnly,
	});
	REFERENCES.set(proxy, { region, node });
	return proxy;
}
