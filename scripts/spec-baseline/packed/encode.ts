/**
 * The encoder of a packed spec: the JSON of `html-spec` to the words of `format.ts`, and a region that a composition
 * changes to the words that are appended to it. The Rust program has the same encoder (`crates/markuplint-types/examples/packed_candidates/encode.rs`), and a
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
 * A candidate that is `grouped` has the nodes of each region of a spec numbered again after the walk, by their tag (`group.ts`):
 * what is said above is the numbering of the walk, which is what a composition appends to its base with, and a base that was
 * grouped keeps the numbers that it has.
 *
 * With a base region (a composition), the numbers of the new nodes, lists and indexes go on from the counts of the base, a
 * value that stands for a node of the base (`lazy.ts`) is that node and makes nothing, and an index that has the keys of one
 * that the base has is that one (`format.ts` has the rules).
 *
 * @module
 */
import type { Variant } from './format.ts';

import {
	BARE_FLAG,
	INDEX_MINIMUM,
	NARROW_LIMIT,
	NONE,
	REGIONS,
	SECTION_COUNT,
	Section,
	Tag,
	assertCandidate,
} from './format.ts';
import { groupRegion } from './group.ts';
import { HASH_FUNCTIONS } from './hash.ts';
import { refOf } from './lazy.ts';
import { buildMphf } from './mphf.ts';
import { PackedSpec, type Region } from './read.ts';

const encoder = new TextEncoder();

/** What the format holds of the top level of a spec: the keys of `def` that it knows. */
const DEF_KEYS = ['#globalAttrs', '#aria', '#contentModels'] as const;

/**
 * Stops for a key of `def` that the format does not hold.
 *
 * @param def - The `def` of a spec
 * @throws For another key than the three of `SpecDefs`
 */
export function assertDefKeys(def: Readonly<Record<string, unknown>>): void {
	for (const key of Object.keys(def)) {
		if (!(DEF_KEYS as readonly string[]).includes(key)) {
			throw new Error(`The format holds no "${key}" in def`);
		}
	}
}

/** The strings of a spec: those of a base, which keep their numbers, and the ones that are added after them. */
export class StringTable {
	private readonly base: PackedSpec | null;
	private readonly added: string[] = [];
	private readonly addedBytes: Uint8Array[] = [];
	private readonly addedIds = new Map<string, number>();
	private readonly baseCount: number;
	private readonly narrow: boolean;

	/**
	 * Starts a table that continues the strings of a spec.
	 *
	 * @param base - The spec whose strings keep their numbers, or `null` for a table that has none
	 * @param narrow - Whether a table that has no base holds its offsets in 16 bits when the strings are few enough. A table that
	 *   continues a spec does as that spec does, so the argument is not given with a base
	 * @throws When both a base and `narrow` are given
	 */
	constructor(base: PackedSpec | null = null, narrow?: boolean) {
		if (base && narrow !== undefined) {
			throw new Error('A table of strings that continues a spec has the offsets that the spec has');
		}
		this.base = base;
		this.baseCount = base?.stringCount ?? 0;
		this.narrow = base ? Boolean(base.variant.narrow) : narrow === true;
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
		if (sid < this.baseCount && this.base) {
			return this.base.stringBytes(sid);
		}
		const added = this.addedBytes[sid - this.baseCount];
		if (!added) {
			throw new Error(`There is no string ${sid}`);
		}
		return added;
	}

	/** Whether a string was added to those of the base. */
	get grown(): boolean {
		return this.added.length > 0;
	}

	/**
	 * The sections of the strings: the offsets, and the bytes padded to whole words.
	 *
	 * @returns The words of the two sections, and whether the offsets are in 16 bits (a table that is asked to have them and that
	 *   has more than 65,535 bytes has them in 32 bits, as every other table does)
	 */
	sections(): { offsets: Uint32Array; bytes: Uint32Array; narrow: boolean } {
		const count = this.baseCount + this.added.length;
		const offsets = new Uint32Array(count + 1);
		// The offsets of the base as numbers, whatever their width, without a copy
		const baseOffsets = this.base?.offsetView();
		const baseBytes = this.base?.sections[Section.StringBytes];
		let total = 0;
		if (baseOffsets && baseBytes) {
			// What the base has is copied as it is, and the new strings go after it
			offsets.set(baseOffsets);
			total = baseOffsets[this.baseCount] ?? 0;
		}
		for (const [position, bytes] of this.addedBytes.entries()) {
			offsets[this.baseCount + position] = total;
			total += bytes.length;
		}
		offsets[count] = total;
		const bytes = new Uint32Array(Math.ceil(total / 4));
		const view = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
		let at = 0;
		if (baseOffsets && baseBytes) {
			at = baseOffsets[this.baseCount] ?? 0;
			view.set(new Uint8Array(baseBytes.buffer, baseBytes.byteOffset, at));
		}
		for (const added of this.addedBytes) {
			view.set(added, at);
			at += added.length;
		}
		if (this.narrow && total <= NARROW_LIMIT) {
			return { offsets: narrowOffsets(offsets), bytes, narrow: true };
		}
		return { offsets, bytes, narrow: false };
	}
}

/**
 * The section of offsets that are held in 16 bits: the count of the strings, then the offsets two to a word (the first of the
 * two is in the low half).
 *
 * @param offsets - The offsets in bytes, one more than the strings, each 65,535 or less
 * @returns The words of the section
 * @throws When an offset is more than 65,535, which a 16-bit number would wrap
 */
export function narrowOffsets(offsets: Uint32Array): Uint32Array {
	if (offsets.some(offset => offset > NARROW_LIMIT)) {
		throw new Error(`An offset is more than ${NARROW_LIMIT}, which 16 bits do not hold`);
	}
	const section = new Uint32Array(1 + Math.ceil(offsets.length / 2));
	section[0] = offsets.length - 1;
	new Uint16Array(section.buffer, section.byteOffset + 4, offsets.length).set(offsets);
	return section;
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

/** Appends numbers to a list, one by one: a spread of a long list is an argument for each, which the call stack bounds. */
function appendWords(target: number[], words: readonly number[]): void {
	for (const word of words) {
		target.push(word);
	}
}

function isNamedObject(value: unknown): value is { name: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		typeof (value as { name?: unknown }).name === 'string'
	);
}

/**
 * The indexes of a region that were walked: a region does not change, and a composition asks for them every time. A region
 * belongs to one spec and so to one variant, which is why the variant is not part of the key.
 */
const INDEXES_OF = new WeakMap<Region, Map<string, number>>();

/**
 * The indexes that a region has, by the string numbers of their keys, which is how an index that is needed again is found: the
 * first of those with the same keys.
 *
 * @param region - The region
 * @param variant - The candidate, which says how long a record of an index is
 * @returns The position of each index, by its keys
 */
export function indexesOf(region: Region, variant: Variant): Map<string, number> {
	const known = INDEXES_OF.get(region);
	if (known) {
		return known;
	}
	const words = region.indexes;
	const found = new Map<string, number>();
	let at = 0;
	while (at < words.length) {
		const entries = words[at] ?? 0;
		const marked = words[at + 1] ?? 0;
		const bare = variant.bare === true && (marked & BARE_FLAG) !== 0;
		const distinct = marked & ~BARE_FLAG;
		const length =
			variant.index === 'sorted'
				? 2 + distinct + entries
				: 5 + Math.ceil((words[at + 3] ?? 0) / 2) + (words[at + 4] ?? 0) + (bare ? 1 : entries);
		// A record without keys has, in place of them, the position of the list of the first object that has the index, whose keys
		// are those of every object that refers to the index
		const key = bare
			? keysOfList(region, variant, words[at + length - 1] ?? 0, entries)
			: [...words.subarray(at + length - entries, at + length)].join(' ');
		if (at + length > words.length) {
			throw new Error(`The index at ${at} is not inside the indexes of its region`);
		}
		const full = indexKey(variant, bare, key);
		if (!found.has(full)) {
			found.set(full, at);
		}
		at += length;
	}
	INDEXES_OF.set(region, found);
	return found;
}

/**
 * The key of an index in the table of the indexes that a region has: the string numbers of its keys, and, for a candidate whose
 * indexes of objects have no keys, which kind of index it is (the index of an array and that of an object are not the same record,
 * since only the first has its keys).
 *
 * @param variant - The candidate
 * @param bare - Whether the index has no keys
 * @param keys - The string numbers of the keys, joined by a space
 * @returns The key
 */
function indexKey(variant: Variant, bare: boolean, keys: string): string {
	return variant.bare ? `${bare ? 'o' : 'a'} ${keys}` : keys;
}

/**
 * The keys of an object that are in its list.
 *
 * @param region - The region
 * @param variant - The candidate, which says how the keys of an object are arranged
 * @param listAt - The position of the list of the object
 * @param entries - How many entries the object has
 * @returns The string numbers of its keys, joined by a space
 */
function keysOfList(region: Region, variant: Variant, listAt: number, entries: number): string {
	if (listAt + (variant.columns ? entries : 2 * entries) > region.lists.length) {
		throw new Error(`An index without keys refers to a list at ${listAt} that the region does not have`);
	}
	const keys = Array.from(
		{ length: entries },
		(_, j) => region.lists[variant.columns ? listAt + j : listAt + 2 * j] ?? 0,
	);
	return keys.join(' ');
}

/**
 * Makes the words of one region. With a base region it appends to it (see `format.ts`): the numbers of the new nodes, lists and
 * indexes go on from those of the base, and a reference to a node of the base (`lazy.ts`) is that node.
 */
class RegionEncoder {
	private readonly strings: StringTable;
	private readonly variant: Variant;
	private readonly base: Region | null;
	private readonly nodes: number[] = [];
	private readonly nodeIds = new Map<string, number>();
	private readonly lists: number[] = [];
	private readonly listIds = new Map<string, number>();
	private readonly indexes: number[] = [];
	private readonly indexIds = new Map<string, number>();
	/** The indexes that the base has: shared by every composition, so never written to. */
	private readonly baseIndexIds: ReadonlyMap<string, number>;

	constructor(strings: StringTable, variant: Variant, base: Region | null = null) {
		assertCandidate(variant);
		this.strings = strings;
		this.variant = variant;
		this.base = base;
		this.baseIndexIds = base ? indexesOf(base, variant) : new Map();
	}

	private node(tag: number, a: number, b: number, c: number): number {
		const key = `${tag} ${a} ${b} ${c}`;
		const known = this.nodeIds.get(key);
		if (known !== undefined) {
			return known;
		}
		const id = (this.base?.count ?? 0) + this.nodes.length / 4;
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
		const offset = (this.base?.lists.length ?? 0) + this.lists.length;
		appendWords(this.lists, words);
		this.listIds.set(key, offset);
		return offset;
	}

	/**
	 * Makes the index of entries with these keys, and gives its position.
	 *
	 * @param keys - The string numbers of the keys
	 * @param bare - Whether the index is that of an object and has no keys of its own (only a candidate that asks for it)
	 * @param listAt - For such an index, the position of the list of the object, which holds the keys that the record does not
	 * @returns The position of the index among the indexes of the region
	 */
	private index(keys: readonly number[], bare = false, listAt = 0): number {
		const key = indexKey(this.variant, bare, keys.join(' '));
		const known = this.indexIds.get(key) ?? this.baseIndexIds.get(key);
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
		const words: number[] = [keys.length, (distinct.length | (bare ? BARE_FLAG : 0)) >>> 0];
		if (this.variant.index === 'sorted') {
			const order = distinct.toSorted((x, y) => compareBytes(bytes[x] as Uint8Array, bytes[y] as Uint8Array));
			appendWords(words, order);
		} else {
			const hash = HASH_FUNCTIONS[this.variant.hash];
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
				if (this.variant.zero) {
					words.push(entry === NONE ? 0 : (distinct[entry] ?? 0) + 1);
				} else {
					words.push(entry === NONE ? NONE : (distinct[entry] ?? NONE));
				}
			}
		}
		// The keys, or where the list of an object that has them is
		appendWords(words, bare ? [listAt] : keys);
		const offset = (this.base?.indexes.length ?? 0) + this.indexes.length;
		appendWords(this.indexes, words);
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
		const reference = refOf(value);
		if (reference) {
			if (reference.region !== this.base) {
				throw new Error('A reference is to a node of the region that is appended to, and of no other');
			}
			return reference.node;
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
		// The list first, since an index without keys says where the list that holds them is
		const list = this.list(words);
		const index = keys.length >= INDEX_MINIMUM ? this.index(keys, this.variant.bare === true, list) + 1 : 0;
		return this.node(Tag.Object, list, keys.length, index);
	}

	/**
	 * The words of the region.
	 *
	 * @param root - The node of the value of the region
	 * @returns The section
	 */
	finish(root: number): Uint32Array {
		const { base } = this;
		const baseCount = base?.count ?? 0;
		const count = baseCount + this.nodes.length / 4;
		const baseLists = base?.lists.length ?? 0;
		const baseIndexes = base?.indexes.length ?? 0;
		const section = new Uint32Array(
			4 + 4 * count + baseLists + this.lists.length + baseIndexes + this.indexes.length,
		);
		section[0] = count;
		section[1] = baseLists + this.lists.length;
		section[2] = baseIndexes + this.indexes.length;
		section[3] = root;
		const field = (node: number, index: number): number => {
			if (node >= baseCount || !base) {
				return this.nodes[4 * (node - baseCount) + index] ?? 0;
			}
			switch (index) {
				case 0: {
					return base.tag(node);
				}
				case 1: {
					return base.a(node);
				}
				case 2: {
					return base.b(node);
				}
				default: {
					return base.c(node);
				}
			}
		};
		if (this.variant.columns) {
			for (let node = 0; node < count; node++) {
				for (let index = 0; index < 4; index++) {
					section[4 + index * count + node] = field(node, index);
				}
			}
		} else {
			if (base) {
				section.set(base.nodes, 4);
			}
			section.set(this.nodes, 4 + 4 * baseCount);
		}
		const listsAt = 4 + 4 * count;
		if (base) {
			section.set(base.lists, listsAt);
		}
		section.set(this.lists, listsAt + baseLists);
		const indexesAt = listsAt + baseLists + this.lists.length;
		if (base) {
			section.set(base.indexes, indexesAt);
		}
		section.set(this.indexes, indexesAt + baseIndexes);
		return section;
	}
}

/**
 * Encodes one region.
 *
 * @param value - The value of the region
 * @param strings - The strings, to which the new ones of the region are added
 * @param variant - The candidate
 * @param base - The region that this is appended to, whose nodes the references in the value are (`lazy.ts`)
 * @returns The words of the section
 */
export function encodeRegion(
	value: unknown,
	strings: StringTable,
	variant: Variant,
	base: Region | null = null,
): Uint32Array {
	const regionEncoder = new RegionEncoder(strings, variant, base);
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
	assertDefKeys(def);
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
	const { offsets, bytes, narrow } = strings.sections();
	const sections: Uint32Array[] = Array.from({ length: SECTION_COUNT }, () => new Uint32Array(3));
	sections[Section.StringOffsets] = offsets;
	sections[Section.StringBytes] = bytes;
	for (const [position, id] of REGIONS.entries()) {
		sections[id] = regions[position] ?? new Uint32Array(0);
	}
	return new PackedSpec(widened(variant, narrow), sections, { computeBits: true });
}

/**
 * The candidate that a table of strings that turned out to need 32-bit offsets belongs to.
 *
 * @param variant - The candidate that asked for 16-bit offsets, or did not
 * @param narrow - Whether the table has them
 * @returns The candidate, as it is when the table is as it asked, and without `narrow` when it is not
 */
export function widened(variant: Variant, narrow: boolean): Variant {
	if (Boolean(variant.narrow) === narrow) {
		return variant;
	}
	return Object.fromEntries(Object.entries(variant).filter(([key]) => key !== 'narrow')) as unknown as Variant;
}

/**
 * Encodes a spec.
 *
 * @param spec - The spec, as `index.json` has it
 * @param variant - The candidate
 * @returns The packed spec
 */
export function encodeSpec(spec: SpecLike, variant: Variant): PackedSpec {
	const strings = new StringTable(null, variant.narrow === true);
	const regions = regionValues(spec).map(value => {
		const words = encodeRegion(value, strings, variant);
		return variant.grouped ? groupRegion(words, variant.columns, variant.bare === true) : words;
	});
	return assemble(variant, strings, regions);
}
