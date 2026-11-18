/**
 * The reader of a packed spec (the layout is in `format.ts`): it opens the words of a file, checks them, and answers
 * from them without copying and without parsing. The Rust reader
 * (`crates/markuplint-types/examples/packed_candidates/read.rs`) does the same in the same steps; the format is chosen
 * from the Rust figures, and this reader is the same algorithm in TypeScript.
 *
 * What `open` checks is the header, the table of sections (every section is inside the file), the checksum of the whole
 * file, and the shape of each section (the table of strings and the header of a region). It does not check each node,
 * list and index that a section holds: a file that has a valid checksum is taken to be what an encoder wrote. A read
 * outside a section gives 0 here (an unsigned word that is not there) and is a panic in the Rust reader; neither is
 * an answer that a well-formed file leads to.
 *
 * Two ways of comparing a name with a key are here, for the measurement of the candidates: the strings are
 * decoded when the file is opened and compared as JavaScript strings (`decoded`), or the bytes of the name are compared
 * with the bytes of the table (`bytes`).
 *
 * @module
 */
import type { Variant } from './format.ts';

import {
	FLAGS,
	HEADER_WORDS,
	MAGIC,
	NONE,
	REGIONS,
	RegionAt,
	SECTION_COUNT,
	Section,
	Tag,
	VERSION,
	variantOf,
	variantWord,
} from './format.ts';
import { HASH_FUNCTIONS, crc32cWords, fmix32, fnv1a32, nameBytes } from './hash.ts';
import { reduce, slotOf, type MphfMode } from './mphf.ts';

// `ignoreBOM` keeps a U+FEFF at the start of a string, which a decoder otherwise takes for the mark of the text and drops
const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
const ENCODER = new TextEncoder();

/** How a name is compared with a key of the table. */
export type StringCompare = 'decoded' | 'bytes';

/** What a reader is given besides the words. */
export interface OpenOptions {
	readonly compare?: StringCompare;
	/** The decoded strings of a spec that this one continues (a composed spec has the strings of its base at the start). */
	readonly decoded?: readonly string[];
}

const u = (array: Uint32Array, index: number): number => array[index] ?? 0;

/**
 * The digest of a value, which is what a question about a path is answered with: the same for the packed tree and for the
 * JSON that it came from, so that a reader is wrong exactly when its answer differs.
 *
 * @param tag - The tag of the value
 * @param payload - For a number its value, for a string the FNV-1a of its bytes, for an array or an object how many items or entries it has
 * @returns A number that is never 0 (0 is "there is no such value")
 */
export function digestOf(tag: number, payload: number): number {
	const value = fmix32((Math.imul(tag + 1, 0x9E_37_79_B1) ^ payload) >>> 0);
	return value === 0 ? 1 : value;
}

/**
 * The digest of a JSON value.
 *
 * @param value - A value that the format holds
 * @returns The digest
 */
export function digestJson(value: unknown): number {
	if (value === null) {
		return digestOf(Tag.Null, 0);
	}
	switch (typeof value) {
		case 'boolean': {
			return digestOf(value ? Tag.True : Tag.False, 0);
		}
		case 'number': {
			return digestOf(Tag.Uint, value);
		}
		case 'string': {
			return digestOf(Tag.String, fnv1a32(ENCODER.encode(value)));
		}
		case 'object': {
			return Array.isArray(value)
				? digestOf(Tag.Array, value.length)
				: digestOf(Tag.Object, Object.values(value).filter(item => item !== undefined).length);
		}
		default: {
			throw new Error(`The format holds no ${typeof value}`);
		}
	}
}

/** One region: its nodes, lists and indexes, which are views of the section (the layout is in `format.ts`). */
export class Region {
	readonly nodes: Uint32Array;
	readonly lists: Uint32Array;
	readonly indexes: Uint32Array;
	readonly root: number;
	readonly count: number;
	/** The position of field `f` of node `n` is `n * nodeStride + f * fieldStride`. */
	readonly nodeStride: number;
	readonly fieldStride: number;

	/**
	 * Views the words of a region.
	 *
	 * @param section - The words of the section: the counts, the root, then the nodes, the lists and the indexes
	 * @param columns - Whether the nodes are in columns (`true`) or in rows
	 * @throws When the section is not as long as its counts say, or its root is not one of its nodes
	 */
	constructor(section: Uint32Array, columns: boolean) {
		const count = u(section, 0);
		const lists = u(section, 1);
		const indexes = u(section, 2);
		if (4 + 4 * count + lists + indexes !== section.length) {
			throw new Error('A region is not as long as its header says');
		}
		this.count = count;
		this.root = u(section, 3);
		this.nodes = section.subarray(4, 4 + 4 * count);
		this.lists = section.subarray(4 + 4 * count, 4 + 4 * count + lists);
		this.indexes = section.subarray(4 + 4 * count + lists);
		this.nodeStride = columns ? 1 : 4;
		this.fieldStride = columns ? count : 1;
		if (this.root >= count) {
			throw new Error('The root of a region is not a node of it');
		}
	}

	/**
	 * The tag of a node.
	 *
	 * @param node - The node
	 * @returns One of {@link Tag}
	 */
	tag(node: number): number {
		return this.nodes[node * this.nodeStride] ?? Tag.Null;
	}

	/**
	 * The first field of a node: a number, or the number of a string, or the position of a list.
	 *
	 * @param node - The node
	 * @returns The word
	 */
	a(node: number): number {
		return this.nodes[node * this.nodeStride + this.fieldStride] ?? 0;
	}

	/**
	 * The second field of a node: how many items or entries it has.
	 *
	 * @param node - The node
	 * @returns The word
	 */
	b(node: number): number {
		return this.nodes[node * this.nodeStride + 2 * this.fieldStride] ?? 0;
	}

	/**
	 * The third field of a node: the position of its index plus one, or 0.
	 *
	 * @param node - The node
	 * @returns The word
	 */
	c(node: number): number {
		return this.nodes[node * this.nodeStride + 3 * this.fieldStride] ?? 0;
	}
}

/**
 * The words of a file that was read as bytes.
 *
 * @param bytes - The bytes
 * @returns The words, as a view when the bytes are aligned and a copy when they are not
 */
export function wordsOf(bytes: Uint8Array): Uint32Array {
	if (bytes.byteLength % 4 !== 0) {
		throw new Error('A packed spec is made of whole words');
	}
	return bytes.byteOffset % 4 === 0
		? new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
		: new Uint32Array(Uint8Array.from(bytes).buffer);
}

const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

/** A packed spec: the sections of a file, which a composed spec shares with its base for those it did not change. */
export class PackedSpec {
	readonly variant: Variant;
	readonly sections: readonly Uint32Array[];
	readonly regions: readonly Region[];
	readonly compare: StringCompare;
	/** The decoded strings, when they are compared as strings. */
	readonly decoded: readonly string[] | null;
	private readonly offsets: Uint32Array;
	private readonly bytes: Uint8Array;
	private readonly mode: MphfMode | null;
	private readonly hash: (bytes: Uint8Array, seed: number) => number;
	private readonly rowEntries: boolean;
	private ids: Map<string, number> | null = null;

	/**
	 * Views the sections of a spec.
	 *
	 * @param variant - The candidate
	 * @param sections - The words of the eight sections
	 * @param options - How strings are compared
	 * @throws When the sections are not the sections of a spec: their number, the table of strings, a region
	 */
	constructor(variant: Variant, sections: readonly Uint32Array[], options: OpenOptions = {}) {
		if (!LITTLE_ENDIAN) {
			throw new Error('A packed spec is little-endian and this machine is not');
		}
		if (sections.length !== SECTION_COUNT) {
			throw new Error(`A packed spec has ${SECTION_COUNT} sections, not ${sections.length}`);
		}
		this.variant = variant;
		this.sections = sections;
		this.compare = options.compare ?? 'bytes';
		this.rowEntries = !variant.columns;
		this.mode = variant.index === 'sorted' ? null : variant.index;
		this.hash = HASH_FUNCTIONS[variant.hash];
		this.offsets = sections[Section.StringOffsets] ?? new Uint32Array(1);
		const stringWords = sections[Section.StringBytes] ?? new Uint32Array(0);
		const length = u(this.offsets, this.offsets.length - 1);
		if (u(this.offsets, 0) !== 0) {
			throw new Error('The table of string offsets does not start at 0');
		}
		for (let sid = 1; sid < this.offsets.length; sid++) {
			if (u(this.offsets, sid) < u(this.offsets, sid - 1)) {
				throw new Error('The table of string offsets is not in order');
			}
		}
		if (length > stringWords.length * 4 || length <= (stringWords.length - 1) * 4) {
			throw new Error('The bytes of the strings are not as long as their offsets say');
		}
		this.bytes = new Uint8Array(stringWords.buffer, stringWords.byteOffset, length);
		this.regions = REGIONS.map(id => new Region(sections[id] ?? new Uint32Array(0), variant.columns));
		if (this.compare === 'decoded') {
			const decoded = options.decoded ? [...options.decoded] : [];
			for (let sid = decoded.length; sid < this.stringCount; sid++) {
				decoded.push(this.decode(sid));
			}
			this.decoded = decoded;
		} else {
			this.decoded = null;
		}
	}

	/**
	 * Opens a file: checks the header, the table of sections and the checksum, and views the sections.
	 *
	 * @param words - The words of the file
	 * @param options - How strings are compared
	 * @returns The spec
	 * @throws For a file that is not a packed spec, of another version, cut short, or changed
	 */
	static open(words: Uint32Array, options: OpenOptions = {}): PackedSpec {
		if (words.length < HEADER_WORDS + 1) {
			throw new Error('The file is shorter than the header of a packed spec');
		}
		if (u(words, 0) !== MAGIC) {
			throw new Error('The file is not a packed spec (the magic is wrong)');
		}
		if (u(words, 1) !== VERSION) {
			throw new Error(
				`The version ${u(words, 1)} of the format is not the one that this reader has (${VERSION})`,
			);
		}
		const variant = variantOf(u(words, 2));
		if (u(words, 3) !== SECTION_COUNT) {
			throw new Error(`The file has ${u(words, 3)} sections, not ${SECTION_COUNT}`);
		}
		const end = words.length - 1;
		let next = HEADER_WORDS;
		const sections: Uint32Array[] = [];
		for (let id = 0; id < SECTION_COUNT; id++) {
			const offset = u(words, 4 + 2 * id);
			const length = u(words, 5 + 2 * id);
			if (offset !== next || offset + length > end) {
				throw new Error(`The section ${id} is not inside the file`);
			}
			sections.push(words.subarray(offset, offset + length));
			next = offset + length;
		}
		if (next !== end) {
			throw new Error('There are words between the last section and the checksum');
		}
		if (crc32cWords(words, end) !== u(words, end)) {
			throw new Error('The checksum of the file is not the one it holds');
		}
		return new PackedSpec(variant, sections, options);
	}

	/**
	 * Makes the spec that has these sections in place of the ones it has. A table of strings that is given has to
	 * continue the one that this spec has (the numbers of the strings it has are the same), because the sections that
	 * are kept refer to them.
	 *
	 * @param changes - The new words of some sections, by section
	 * @param options - How strings are compared
	 * @returns A spec that shares the sections that are not changed
	 * @throws When the offsets or the bytes of the new strings do not start with those of the old ones
	 */
	replace(changes: Readonly<Record<number, Uint32Array>>, options: OpenOptions = {}): PackedSpec {
		const offsets = changes[Section.StringOffsets];
		if (offsets) {
			if (offsets.length < this.offsets.length) {
				throw new Error('The new table of strings is shorter than the one it replaces');
			}
			for (let i = 0; i < this.offsets.length; i++) {
				if (u(offsets, i) !== u(this.offsets, i)) {
					throw new Error('The new table of strings does not continue the one it replaces');
				}
			}
		}
		const bytes = changes[Section.StringBytes];
		if (bytes) {
			const kept = new Uint8Array(bytes.buffer, bytes.byteOffset, this.bytes.length);
			if (bytes.length * 4 < this.bytes.length || kept.some((byte, at) => byte !== this.bytes[at])) {
				throw new Error('The new table of string bytes does not continue the one it replaces');
			}
		}
		const sections = this.sections.map((section, id) => changes[id] ?? section);
		return new PackedSpec(this.variant, sections, {
			compare: this.compare,
			decoded: this.decoded ?? undefined,
			...options,
		});
	}

	/**
	 * The words of the file that holds this spec: the header, the sections and the checksum.
	 *
	 * @returns The words
	 */
	serialize(): Uint32Array {
		const total = HEADER_WORDS + this.sections.reduce((sum, section) => sum + section.length, 0) + 1;
		const words = new Uint32Array(total);
		words[0] = MAGIC;
		words[1] = VERSION;
		words[2] = variantWord(this.variant);
		words[3] = SECTION_COUNT;
		let at = HEADER_WORDS;
		for (const [id, section] of this.sections.entries()) {
			words[4 + 2 * id] = at;
			words[5 + 2 * id] = section.length;
			words.set(section, at);
			at += section.length;
		}
		words[total - 1] = crc32cWords(words, total - 1);
		return words;
	}

	/** How many strings the spec has. */
	get stringCount(): number {
		return this.offsets.length - 1;
	}

	private decode(sid: number): string {
		const start = u(this.offsets, sid);
		const end = u(this.offsets, sid + 1);
		let ascii = true;
		for (let i = start; i < end; i++) {
			if ((this.bytes[i] ?? 0) > 127) {
				ascii = false;
				break;
			}
		}
		if (!ascii) {
			return decoder.decode(this.bytes.subarray(start, end));
		}
		let text = '';
		for (let i = start; i < end; i++) {
			text += String.fromCodePoint(this.bytes[i] ?? 0);
		}
		return text;
	}

	/**
	 * The string with this number.
	 *
	 * @param sid - The number
	 * @returns The string
	 */
	stringAt(sid: number): string {
		if (sid >= this.stringCount) {
			throw new Error(`There is no string ${sid}`);
		}
		return this.decoded?.[sid] ?? this.decode(sid);
	}

	/**
	 * The bytes of the string with this number.
	 *
	 * @param sid - The number
	 * @returns A view of the bytes
	 */
	stringBytes(sid: number): Uint8Array {
		return this.bytes.subarray(u(this.offsets, sid), u(this.offsets, sid + 1));
	}

	/**
	 * The number of a string. The table from the strings to the numbers is made the first time it is asked and is kept: a
	 * composition keeps the numbers of the strings of the spec that it composes and adds the new ones after them.
	 *
	 * @param text - The string
	 * @returns The number, or `undefined` when the spec does not have it
	 */
	stringId(text: string): number | undefined {
		this.ids ??= new Map(Array.from({ length: this.stringCount }, (_, sid) => [this.stringAt(sid), sid] as const));
		return this.ids.get(text);
	}

	private keyEquals(sid: number, query: Uint8Array, name: string): boolean {
		if (this.decoded) {
			return this.decoded[sid] === name;
		}
		const start = u(this.offsets, sid);
		const length = u(this.offsets, sid + 1) - start;
		if (length !== query.length) {
			return false;
		}
		for (let i = 0; i < length; i++) {
			if (this.bytes[start + i] !== query[i]) {
				return false;
			}
		}
		return true;
	}

	/** Compares the bytes of a key with the bytes of a name: negative when the key is the smaller. */
	private compareKey(sid: number, query: Uint8Array): number {
		const start = u(this.offsets, sid);
		const length = u(this.offsets, sid + 1) - start;
		const common = Math.min(length, query.length);
		for (let i = 0; i < common; i++) {
			const difference = (this.bytes[start + i] ?? 0) - (query[i] ?? 0);
			if (difference !== 0) {
				return difference;
			}
		}
		return length - query.length;
	}

	/**
	 * Finds the position of a key in an index.
	 *
	 * @param region - The region of the index
	 * @param index - The position of the index in the region
	 * @param query - The bytes of the name
	 * @param name - The name
	 * @returns The position of the entry, or {@link NONE}
	 */
	private findEntry(region: Region, index: number, query: Uint8Array, name: string): number {
		const words = region.indexes;
		const entries = u(words, index);
		const distinct = u(words, index + 1);
		if (this.mode === null) {
			const orderAt = index + 2;
			const keysAt = orderAt + distinct;
			let low = 0;
			let high = distinct - 1;
			while (low <= high) {
				const middle = (low + high) >>> 1;
				const position = u(words, orderAt + middle);
				const difference = this.compareKey(u(words, keysAt + position), query);
				if (difference === 0) {
					return position;
				}
				if (difference < 0) {
					low = middle + 1;
				} else {
					high = middle - 1;
				}
			}
			return NONE;
		}
		const seed = u(words, index + 2);
		const buckets = u(words, index + 3);
		const slots = u(words, index + 4);
		const pilotsAt = index + 5;
		const slotsAt = pilotsAt + ((buckets + 1) >>> 1);
		const keysAt = slotsAt + slots;
		const hash = this.hash(query, seed);
		const bucket = reduce(hash, buckets);
		const pilot = (u(words, pilotsAt + (bucket >>> 1)) >>> ((bucket & 1) << 4)) & 0xFF_FF;
		const position = u(words, slotsAt + slotOf(hash, pilot, slots, this.mode));
		if (position === NONE || position >= entries) {
			return NONE;
		}
		return this.keyEquals(u(words, keysAt + position), query, name) ? position : NONE;
	}

	/** The position in the list of an object of the entry `j`: where its key and its value are. */
	private entryKeyAt(a: number, j: number): number {
		return this.rowEntries ? a + 2 * j : a + j;
	}

	private entryValueAt(a: number, b: number, j: number): number {
		return this.rowEntries ? a + 2 * j + 1 : a + b + j;
	}

	/**
	 * The tag of a node.
	 *
	 * @param region - The region
	 * @param node - The node
	 * @returns One of {@link Tag}
	 */
	tag(region: Region, node: number): number {
		return region.tag(node);
	}

	/**
	 * The value of a key of an object.
	 *
	 * @param region - The region
	 * @param node - The object
	 * @param name - The key
	 * @returns The node of the value, or {@link NONE} when the node is not an object or has no such key
	 */
	get(region: Region, node: number, name: string): number {
		const position = this.entry(region, node, name);
		return position === NONE ? NONE : this.valueAt(region, node, position);
	}

	/**
	 * The position of a key among the entries of an object, which is where its value is, and, for `#contentModels`, the row of
	 * the bits of the category.
	 *
	 * @param region - The region
	 * @param node - The object
	 * @param name - The key
	 * @returns The position, or {@link NONE} when the node is not an object or has no such key
	 */
	entry(region: Region, node: number, name: string): number {
		if (region.tag(node) !== Tag.Object) {
			return NONE;
		}
		const a = region.a(node);
		const b = region.b(node);
		const index = region.c(node);
		const query = nameBytes(name);
		if (index !== 0) {
			return this.findEntry(region, index - 1, query, name);
		}
		for (let j = 0; j < b; j++) {
			if (this.keyEquals(u(region.lists, this.entryKeyAt(a, j)), query, name)) {
				return j;
			}
		}
		return NONE;
	}

	/**
	 * An item of an array.
	 *
	 * @param region - The region
	 * @param node - The array
	 * @param position - The position
	 * @returns The node of the item, or {@link NONE}
	 */
	at(region: Region, node: number, position: number): number {
		if (region.tag(node) !== Tag.Array || position < 0 || position >= region.b(node)) {
			return NONE;
		}
		return u(region.lists, region.a(node) + position);
	}

	/**
	 * The object of an array that has this name: `find(item => item.name === name)`.
	 *
	 * @param region - The region
	 * @param node - The array
	 * @param name - The name
	 * @returns The node of the object, or {@link NONE}
	 */
	find(region: Region, node: number, name: string): number {
		const position = this.position(region, node, name);
		return position === NONE ? NONE : this.at(region, node, position);
	}

	/**
	 * The position of the object of an array that has this name, which is the position of an element in `specs`.
	 *
	 * @param region - The region
	 * @param node - The array
	 * @param name - The name
	 * @returns The position of the first object that has it, or {@link NONE}
	 */
	position(region: Region, node: number, name: string): number {
		if (region.tag(node) !== Tag.Array) {
			return NONE;
		}
		const a = region.a(node);
		const count = region.b(node);
		const index = region.c(node);
		if (index !== 0) {
			return this.findEntry(region, index - 1, nameBytes(name), name);
		}
		// `get` uses the shared buffer of `nameBytes` for 'name', so the bytes of this name are kept in a copy
		const wanted = Uint8Array.from(nameBytes(name));
		for (let j = 0; j < count; j++) {
			const itemName = this.get(region, u(region.lists, a + j), 'name');
			if (
				itemName !== NONE &&
				region.tag(itemName) === Tag.String &&
				this.keyEquals(region.a(itemName), wanted, name)
			) {
				return j;
			}
		}
		return NONE;
	}

	/**
	 * How many items or entries a node has.
	 *
	 * @param region - The region
	 * @param node - The array or object
	 * @returns The count
	 */
	count(region: Region, node: number): number {
		return region.b(node);
	}

	/**
	 * The key of the `j`th entry of an object.
	 *
	 * @param region - The region
	 * @param node - The object
	 * @param j - The position
	 * @returns The string number of the key
	 */
	keyAt(region: Region, node: number, j: number): number {
		return u(region.lists, this.entryKeyAt(region.a(node), j));
	}

	/**
	 * The value of the `j`th entry of an object.
	 *
	 * @param region - The region
	 * @param node - The object
	 * @param j - The position
	 * @returns The node of the value
	 */
	valueAt(region: Region, node: number, j: number): number {
		return u(region.lists, this.entryValueAt(region.a(node), region.b(node), j));
	}

	/**
	 * The digest of a node (see {@link digestOf}).
	 *
	 * @param region - The region
	 * @param node - The node, or {@link NONE} for a value that is not there
	 * @returns The digest, 0 for {@link NONE}
	 */
	digest(region: Region, node: number): number {
		if (node === NONE) {
			return 0;
		}
		const tag = region.tag(node);
		switch (tag) {
			case Tag.Uint: {
				return digestOf(tag, region.a(node));
			}
			case Tag.String: {
				return digestOf(tag, fnv1a32(this.stringBytes(region.a(node))));
			}
			case Tag.Array:
			case Tag.Object: {
				return digestOf(tag, region.b(node));
			}
			default: {
				return digestOf(tag, 0);
			}
		}
	}

	/** The number of elements of `specs`. */
	get elementCount(): number {
		return u(this.sections[Section.Bits] ?? new Uint32Array(3), 0);
	}

	/**
	 * Whether an element has a flag, from the bits.
	 *
	 * @param element - The position of the element in `specs`
	 * @param flag - The position of the flag in `FLAGS`
	 * @returns 1 or 0
	 */
	flag(element: number, flag: number): number {
		const bits = this.sections[Section.Bits] ?? new Uint32Array(3);
		return (u(bits, 3 + element) >>> flag) & 1;
	}

	/**
	 * Whether an element is a member of a category by its name, from the bits.
	 *
	 * @param element - The position of the element in `specs`
	 * @param category - The position of the category in `#contentModels`
	 * @returns 1 or 0
	 */
	member(element: number, category: number): number {
		const bits = this.sections[Section.Bits] ?? new Uint32Array(3);
		const elements = u(bits, 0);
		const perRow = u(bits, 2);
		return (u(bits, 3 + elements + category * perRow + (element >>> 5)) >>> (element & 31)) & 1;
	}

	/**
	 * Computes the bits from the regions: the flags of each element of `specs`, and, for each category of
	 * `#contentModels`, the elements that are its members by name.
	 *
	 * @returns The words of the section
	 */
	computeBits(): Uint32Array {
		const specs = this.regions[RegionAt.Specs] as Region;
		const content = this.regions[RegionAt.ContentModels] as Region;
		const elements = specs.tag(specs.root) === Tag.Array ? specs.b(specs.root) : 0;
		const categories = content.tag(content.root) === Tag.Object ? content.b(content.root) : 0;
		const perRow = Math.ceil(elements / 32);
		const words = new Uint32Array(3 + elements + categories * perRow);
		words[0] = elements;
		words[1] = categories;
		words[2] = perRow;
		const positions = new Map<string, number>();
		for (let element = 0; element < elements; element++) {
			const node = this.at(specs, specs.root, element);
			const name = this.get(specs, node, 'name');
			if (name !== NONE && specs.tag(name) === Tag.String) {
				const text = this.stringAt(specs.a(name));
				if (!positions.has(text)) {
					positions.set(text, element);
				}
			}
			let flags = 0;
			for (const [bit, flag] of FLAGS.entries()) {
				const value = this.get(specs, node, flag);
				if (value !== NONE && specs.tag(value) === Tag.True) {
					flags |= 1 << bit;
				}
			}
			words[3 + element] = flags >>> 0;
		}
		for (let category = 0; category < categories; category++) {
			const list = this.valueAt(content, content.root, category);
			const members = content.tag(list) === Tag.Array ? content.b(list) : 0;
			for (let member = 0; member < members; member++) {
				const item = this.at(content, list, member);
				if (content.tag(item) !== Tag.String) {
					continue;
				}
				const element = positions.get(this.stringAt(content.a(item)));
				if (element !== undefined) {
					const at = 3 + elements + category * perRow + (element >>> 5);
					words[at] = ((words[at] ?? 0) | (1 << (element & 31))) >>> 0;
				}
			}
		}
		return words;
	}

	/**
	 * The value of a node as JSON.
	 *
	 * @param region - The region
	 * @param node - The node
	 * @returns The value
	 */
	toValue(region: Region, node: number): unknown {
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
				return this.stringAt(region.a(node));
			}
			case Tag.Array: {
				return Array.from({ length: region.b(node) }, (_, position) =>
					this.toValue(region, this.at(region, node, position)),
				);
			}
			case Tag.Object: {
				// `Object.fromEntries` makes an own property of a key that is `__proto__`, as the JSON text does
				return Object.fromEntries(
					Array.from({ length: region.b(node) }, (_, j) => [
						this.stringAt(this.keyAt(region, node, j)),
						this.toValue(region, this.valueAt(region, node, j)),
					]),
				);
			}
			default: {
				throw new Error(`There is no tag ${region.tag(node)}`);
			}
		}
	}

	/**
	 * The value of a region as JSON.
	 *
	 * @param id - One of {@link REGIONS}
	 * @returns The value
	 */
	regionValue(id: (typeof REGIONS)[number]): unknown {
		const region = this.regions[REGIONS.indexOf(id)] as Region;
		return this.toValue(region, region.root);
	}

	/**
	 * The whole spec as JSON, in the shape of `index.json`: `def`, `specs`, and the keys of the rest.
	 *
	 * @returns The spec
	 */
	toJson(): Record<string, unknown> {
		return {
			def: {
				'#globalAttrs': this.regionValue(Section.GlobalAttrs),
				'#aria': this.regionValue(Section.Aria),
				'#contentModels': this.regionValue(Section.ContentModels),
			},
			specs: this.regionValue(Section.Specs),
			...(this.regionValue(Section.Rest) as Record<string, unknown>),
		};
	}
}
