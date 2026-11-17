/**
 * The encoder of a packed spec: the JSON of `html-spec` (or of a spec that an extension was merged into) to the words of
 * `format.ts`. The Rust program has the same encoder (`crates/markuplint-types/examples/packed_candidates/encode.rs`), and a
 * spec that either makes is the same bytes: the order in which strings and nodes are numbered is the order of the walk
 * that is written here, and nothing in it depends on the engine (a `Map` of JavaScript keeps its insertion order, and
 * an object that has a key that looks like an integer is the one case in which the order of the keys would be different
 * from the order in the JSON text, which the data does not have).
 *
 * The walk:
 *
 * 1. The strings are numbered in the order that the regions are encoded (`specs`, `#globalAttrs`, `#aria`,
 *    `#contentModels`, the rest) and, inside a region, in the order that the walk meets them: for an object, a key and
 *    then what it holds; for an array, each item.
 * 2. A node, a list and an index are numbered when they are made, which is after what they refer to, and one that
 *    is the same as an earlier one is not made again.
 *
 * @module
 */
import type { Variant } from './format.ts';

import { INDEX_MINIMUM, NONE, REGIONS, SECTION_COUNT, Section, Tag } from './format.ts';
import { murmur3, xxhash32 } from './hash.ts';
import { buildMphf } from './mphf.ts';
import { PackedSpec } from './read.ts';

const encoder = new TextEncoder();

/** What the format holds of the top level of a spec: the keys of `def` that it knows. */
const DEF_KEYS = ['#globalAttrs', '#aria', '#contentModels'] as const;

/** The strings of a spec: those of a base, which keep their numbers, and the ones that are added after them. */
export class StringTable {
	private readonly base: PackedSpec | null;
	private readonly added: string[] = [];
	private readonly addedBytes: Uint8Array[] = [];
	private readonly addedIds = new Map<string, number>();
	private readonly baseCount: number;

	constructor(base: PackedSpec | null = null) {
		this.base = base;
		this.baseCount = base?.stringCount ?? 0;
	}

	/**
	 * The number of a string, which is added when it is new.
	 *
	 * @param text - The string
	 * @returns The number
	 */
	intern(text: string): number {
		const known = this.base?.stringId(text) ?? this.addedIds.get(text);
		if (known !== undefined) {
			return known;
		}
		const sid = this.baseCount + this.added.length;
		this.added.push(text);
		this.addedBytes.push(encoder.encode(text));
		this.addedIds.set(text, sid);
		return sid;
	}

	/**
	 * The bytes of a string.
	 *
	 * @param sid - The number
	 * @returns The bytes
	 */
	bytes(sid: number): Uint8Array {
		if (sid < this.baseCount) {
			return (this.base as PackedSpec).stringBytes(sid);
		}
		return this.addedBytes[sid - this.baseCount] ?? new Uint8Array(0);
	}

	/** Whether a string was added to those of the base. */
	get grown(): boolean {
		return this.added.length > 0;
	}

	/**
	 * The sections of the strings: the offsets, and the bytes padded to whole words.
	 *
	 * @returns The words of the two sections
	 */
	sections(): { offsets: Uint32Array; bytes: Uint32Array } {
		const count = this.baseCount + this.added.length;
		const offsets = new Uint32Array(count + 1);
		let total = 0;
		for (let sid = 0; sid < count; sid++) {
			offsets[sid] = total;
			total += this.bytes(sid).length;
		}
		offsets[count] = total;
		const bytes = new Uint32Array(Math.ceil(total / 4));
		const view = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		for (let sid = 0; sid < count; sid++) {
			view.set(this.bytes(sid), offsets[sid]);
		}
		return { offsets, bytes };
	}
}

/**
 * Compares two keys by their bytes.
 *
 * @param a - A key
 * @param b - A key
 * @returns Negative when `a` is the smaller
 */
export function compareBytes(a: Uint8Array, b: Uint8Array): number {
	const common = Math.min(a.length, b.length);
	for (let i = 0; i < common; i++) {
		const difference = (a[i] ?? 0) - (b[i] ?? 0);
		if (difference !== 0) {
			return difference;
		}
	}
	return a.length - b.length;
}

function isNamedObject(value: unknown): value is { name: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		typeof (value as { name?: unknown }).name === 'string'
	);
}

/** Makes the words of one region. */
class RegionEncoder {
	private readonly strings: StringTable;
	private readonly variant: Variant;
	private readonly nodes: number[] = [];
	private readonly nodeIds = new Map<string, number>();
	private readonly lists: number[] = [];
	private readonly listIds = new Map<string, number>();
	private readonly indexes: number[] = [];
	private readonly indexIds = new Map<string, number>();

	constructor(strings: StringTable, variant: Variant) {
		this.strings = strings;
		this.variant = variant;
	}

	private node(tag: number, a: number, b: number, c: number): number {
		const key = `${tag} ${a} ${b} ${c}`;
		const known = this.nodeIds.get(key);
		if (known !== undefined) {
			return known;
		}
		const id = this.nodes.length / 4;
		this.nodes.push(tag, a, b, c);
		this.nodeIds.set(key, id);
		return id;
	}

	private list(words: readonly number[]): number {
		if (words.length === 0) {
			return 0;
		}
		const key = words.join(' ');
		const known = this.listIds.get(key);
		if (known !== undefined) {
			return known;
		}
		const offset = this.lists.length;
		this.lists.push(...words);
		this.listIds.set(key, offset);
		return offset;
	}

	/** Makes the index of entries with these keys, and gives its position. */
	private index(keys: readonly number[]): number {
		const key = keys.join(' ');
		const known = this.indexIds.get(key);
		if (known !== undefined) {
			return known;
		}
		const bytes = keys.map(sid => this.strings.bytes(sid));
		const seen = new Set<number>();
		const distinct: number[] = [];
		for (const [position, sid] of keys.entries()) {
			if (!seen.has(sid)) {
				seen.add(sid);
				distinct.push(position);
			}
		}
		const words: number[] = [keys.length, distinct.length];
		if (this.variant.index === 'sorted') {
			const order = distinct.toSorted((x, y) => compareBytes(bytes[x] as Uint8Array, bytes[y] as Uint8Array));
			words.push(...order);
		} else {
			const hash = this.variant.hash === 'murmur3' ? murmur3 : xxhash32;
			const mphf = buildMphf(
				distinct.map(position => bytes[position] as Uint8Array),
				hash,
				this.variant.index,
			);
			words.push(mphf.seed, mphf.buckets, mphf.slots);
			for (let pair = 0; pair < Math.ceil(mphf.buckets / 2); pair++) {
				words.push(((mphf.pilots[2 * pair] ?? 0) | ((mphf.pilots[2 * pair + 1] ?? 0) << 16)) >>> 0);
			}
			for (const entry of mphf.slotEntry) {
				words.push(entry === NONE ? NONE : (distinct[entry] ?? NONE));
			}
		}
		words.push(...keys);
		const offset = this.indexes.length;
		this.indexes.push(...words);
		this.indexIds.set(key, offset);
		return offset;
	}

	/**
	 * Encodes a value, and the values in it.
	 *
	 * @param value - A JSON value: null, a boolean, a non-negative integer below 2^32, a string, an array, an object
	 * @returns The node
	 */
	encode(value: unknown): number {
		if (value === null) {
			return this.node(Tag.Null, 0, 0, 0);
		}
		switch (typeof value) {
			case 'boolean': {
				return this.node(value ? Tag.True : Tag.False, 0, 0, 0);
			}
			case 'number': {
				if (!Number.isInteger(value) || value < 0 || value >= 2 ** 32) {
					throw new Error(`The format holds a non-negative integer below 2^32, not ${value}`);
				}
				return this.node(Tag.Uint, value, 0, 0);
			}
			case 'string': {
				return this.node(Tag.String, this.strings.intern(value), 0, 0);
			}
			case 'object': {
				return Array.isArray(value)
					? this.encodeArray(value)
					: this.encodeObject(value as Record<string, unknown>);
			}
			default: {
				throw new Error(`The format holds no ${typeof value}`);
			}
		}
	}

	private encodeArray(items: readonly unknown[]): number {
		const nodes = items.map(item => {
			if (item === undefined) {
				throw new Error('The format holds no undefined in an array');
			}
			return this.encode(item);
		});
		const named = items.length >= INDEX_MINIMUM && items.every(item => isNamedObject(item));
		const index = named
			? this.index(items.map(item => this.strings.intern((item as { name: string }).name))) + 1
			: 0;
		return this.node(Tag.Array, this.list(nodes), nodes.length, index);
	}

	private encodeObject(object: Record<string, unknown>): number {
		const keys: number[] = [];
		const values: number[] = [];
		for (const [key, value] of Object.entries(object)) {
			if (value === undefined) {
				continue;
			}
			keys.push(this.strings.intern(key));
			values.push(this.encode(value));
		}
		const words = this.variant.columns ? [...keys, ...values] : keys.flatMap((key, j) => [key, values[j] ?? 0]);
		const index = keys.length >= INDEX_MINIMUM ? this.index(keys) + 1 : 0;
		return this.node(Tag.Object, this.list(words), keys.length, index);
	}

	/**
	 * The words of the region.
	 *
	 * @param root - The node of the value of the region
	 * @returns The section
	 */
	finish(root: number): Uint32Array {
		const count = this.nodes.length / 4;
		const section = new Uint32Array(4 + this.nodes.length + this.lists.length + this.indexes.length);
		section[0] = count;
		section[1] = this.lists.length;
		section[2] = this.indexes.length;
		section[3] = root;
		if (this.variant.columns) {
			for (let node = 0; node < count; node++) {
				for (let field = 0; field < 4; field++) {
					section[4 + field * count + node] = this.nodes[4 * node + field] ?? 0;
				}
			}
		} else {
			section.set(this.nodes, 4);
		}
		section.set(this.lists, 4 + this.nodes.length);
		section.set(this.indexes, 4 + this.nodes.length + this.lists.length);
		return section;
	}
}

/**
 * Encodes one region.
 *
 * @param value - The value of the region
 * @param strings - The strings, to which the new ones of the region are added
 * @param variant - The candidate
 * @returns The words of the section
 */
export function encodeRegion(value: unknown, strings: StringTable, variant: Variant): Uint32Array {
	const regionEncoder = new RegionEncoder(strings, variant);
	return regionEncoder.finish(regionEncoder.encode(value));
}

/** What the format holds of a spec: the four regions that have a key, and the rest. */
export interface SpecLike {
	readonly def?: Readonly<Record<string, unknown>>;
	readonly specs?: unknown;
	readonly [key: string]: unknown;
}

/**
 * The values of the regions of a spec, in the order of {@link REGIONS}. A region that the spec lacks is the empty value
 * of its kind: an empty array for `specs`, and an empty object for the others.
 *
 * @param spec - The spec
 * @returns The values
 * @throws For a key of `def` that the format does not hold
 */
export function regionValues(spec: SpecLike): unknown[] {
	const def = spec.def ?? {};
	for (const key of Object.keys(def)) {
		if (!(DEF_KEYS as readonly string[]).includes(key)) {
			throw new Error(`The format holds no "${key}" in def`);
		}
	}
	const rest = Object.fromEntries(Object.entries(spec).filter(([key]) => key !== 'def' && key !== 'specs'));
	return [spec.specs ?? [], def['#globalAttrs'] ?? {}, def['#aria'] ?? {}, def['#contentModels'] ?? {}, rest];
}

/**
 * Puts the strings and the regions together into a spec, with its bits.
 *
 * @param variant - The candidate
 * @param strings - The strings
 * @param regions - The sections of the five regions
 * @returns The spec
 */
export function assemble(variant: Variant, strings: StringTable, regions: readonly Uint32Array[]): PackedSpec {
	const { offsets, bytes } = strings.sections();
	const sections: Uint32Array[] = Array.from({ length: SECTION_COUNT }, () => new Uint32Array(3));
	sections[Section.StringOffsets] = offsets;
	sections[Section.StringBytes] = bytes;
	for (const [position, id] of REGIONS.entries()) {
		sections[id] = regions[position] ?? new Uint32Array(0);
	}
	const draft = new PackedSpec(variant, sections);
	return draft.replace({ [Section.Bits]: draft.computeBits() });
}

/**
 * Encodes a spec.
 *
 * @param spec - The spec, as `index.json` has it
 * @param variant - The candidate
 * @returns The packed spec
 */
export function encodeSpec(spec: SpecLike, variant: Variant): PackedSpec {
	const strings = new StringTable();
	const regions = regionValues(spec).map(value => encodeRegion(value, strings, variant));
	return assemble(variant, strings, regions);
}
