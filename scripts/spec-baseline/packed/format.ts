/* eslint-disable unicorn/number-literal-case -- oxfmt writes the digits of a hexadecimal literal in lower case, and this rule asks for upper case */
/**
 * The layout of the packed candidates: what a file holds, word by word. It is the one description of the format; the
 * encoder (`encode.ts`), the reader (`read.ts`) and the Rust program
 * (`crates/markuplint-types/examples/packed_candidates/`) follow it, and a candidate that this side builds is read there
 * byte for byte.
 *
 * A form of the spec data that a reader queries without parsing it and without copying it: a lookup of an element by
 * name, a flag, a member of a category, an attribute, a role, are reads of words. What the candidates are, and what is
 * the same in all of them:
 *
 * - The data is the JSON of `@markuplint/html-spec` as a tree of values (null, booleans, non-negative integers, strings,
 *   arrays, objects) in 32-bit little-endian words that a reader indexes into without copying and without parsing.
 *   A subtree that is identical to another is stored once, and so is a list of children that is identical to another.
 * - Every string is in one table (UTF-8 bytes and the offsets of each), and a node refers to it by number. A string
 *   is added at the end of the table when a spec is composed, so a number never changes.
 * - The tree is cut at the keys of the spec into **regions**: `specs`, `def['#globalAttrs']`, `def['#aria']`,
 *   `def['#contentModels']`, and the rest. A region has its own nodes, lists and indexes, and refers to other regions by
 *   nothing but string numbers. A composition with an extension appends to the regions that the extension touches and
 *   shares the others as they are (below).
 * - An array of at least {@link INDEX_MINIMUM} objects with a `name` (`specs`, the roles, the properties) and an object of
 *   at least that many keys has an **index** from the name to the position, which a lookup ends by comparing the key itself
 *   with the name that was asked, so a lookup is never wrong whatever the hash.
 * - The flags of every element (`obsolete`, `deprecated`, `nonStandard`, `experimental`) and the members of the categories
 *   that are the name of an element are bits, as `layout.ts` has them: the questions that are asked most are then a
 *   shift and a mask. They are made from the regions, so they cannot differ from them.
 * - The file ends with the CRC-32C of every word before it.
 *
 * What differs between the candidates is the **variant** in the header: how the arrays of a region are arranged (a row for
 * each node and a pair for each entry, or a column for each field), how an index finds a position (a binary search over the
 * keys that are sorted, or a minimal perfect hash with a table of as many slots as keys, or one whose table is a power of
 * two so that a lookup needs no division), and which hash function a perfect hash uses. Four choices that make the file
 * smaller are in the variant too: the nodes numbered by their tag (`grouped`), an empty slot written as 0 (`zero`), the offsets
 * of the strings in 16 bits (`narrow`), and the indexes of objects without their keys (`bare`).
 *
 * The form that is adopted is `rows/pow2/murmur3` with the nodes grouped, the empty slot 0 and the indexes of objects without
 * their keys. The order of what decides it is the speed of a read, the memory, the CPU, and then the size of the file that is
 * distributed, which is its gzip (what an npm tarball carries; the Brotli is printed beside it for a reader who sends it over
 * the web). The candidates with a binary search over sorted keys are slower in the questions, and the offsets of the strings in
 * 16 bits (`narrow`) are slower in Rust (the questions and the composition), as `yarn spec-baseline perf --packed` measures
 * them, so neither is adopted. Of the rest, which read, query and compose in the same time, the smallest in memory and then in
 * gzip is that one (the same command prints the sizes). The other candidates are kept as the record of what was measured.
 *
 * A file, in words (everything is little-endian, and a number is `uint32`):
 *
 * ```text
 * 0       magic            0x50534c4d (the bytes "MLSP")
 * 1       version          1
 * 2       variant          bit 0 columns; bits 1-2 the index (0 sorted, 1 minimal, 2 power of two); bit 3 the hash (0 Murmur3, 1 xxHash32);
 *                         bit 4 is not used; bit 5 the nodes are grouped (what the encoder did, which a reader does not use);
 *                         bit 6 a slot is 0 for none and the position plus one (see below);
 *                         bit 7 the offsets of the strings are 16 bits; bit 8 the indexes of objects have no keys (see below)
 * 3       sections         8
 * 4..19   section table    for each section: the offset in words from the start of the file, and the length in words
 * ...     sections
 * last    checksum         CRC-32C of every word before it
 * ```
 *
 * The sections, in the order of the table:
 *
 * ```text
 * 0 string offsets   count + 1 offsets in bytes into section 1 (the first is 0, the last is the length); with bit 7 of the
 *                    variant, the count of the strings and then the same count + 1 offsets in 16 bits, two to a word (a table whose
 *                    strings are more than 65,535 bytes is written in 32 bits, and its header says so)
 * 1 string bytes     UTF-8, padded to whole words with zero bytes
 * 2 bits             elements, categories, wordsPerRow; then one word of flags for each element (bit i is FLAG_NAMES[i]),
 *                    then wordsPerRow words for each category (the bit e of row c is set when the element at position e of
 *                    `specs` is a member of the category at position c of `#contentModels`, by exactly its name; when two
 *                    elements have the same name it is the first of them that is a member)
 * 3..7 regions       specs, #globalAttrs, #aria, #contentModels, rest (see below)
 * ```
 *
 * A region: `nodes`, `lists`, `indexes`, `root`, then the node words, the list words and the index words.
 *
 * - A node is four words `[tag, a, b, c]`, in a row (`4 * node + field`) or in columns (`field * nodes + node`). A tag is one
 *   of {@link Tag}. `UINT` has its value in `a`, `STRING` has the number of the string in `a`. `ARRAY` and `OBJECT` have the
 *   position of their list in `a`, how many items or entries in `b`, and in `c` the position of their index plus one (0 for
 *   none). An array that has an index is a table of objects with a `name`.
 * - The list of an array is the numbers of its nodes. The list of an object is its entries in the order of the data: pairs
 *   `[key, node]` for rows, or all the keys and then all the nodes for columns. A key is a string number.
 * - An index describes the keys of the entries of one array or object, whatever the arrangement of the region, so that
 *   one index is shared by every list that has the same keys. It is, when the candidate is sorted,
 *   `[entries, n, n positions sorted by the bytes of their key, the string number of the key of each entry]`, and, when it is
 *   a perfect hash, `[entries, n, seed, buckets, slots, pilots, slot -> position, the string number of the key of each entry]`
 *   (see `mphf.ts`; the pilots are 16 bits each and two are in a word; a slot that no key has holds {@link NONE}, or 0 when
 *   bit 6 of the variant is set, and then the others hold the position plus one). `n` is the
 *   number of different keys, in the low 31 bits of its word: the keys are the names of an array's objects or the keys of an object, and a name that comes
 *   twice is indexed at its first position. With bit 8 of the variant, the index of an object (a perfect hash) has no key of
 *   each entry, which the list of the object holds at the position that the slot gave, and ends with one word instead: the
 *   position of the list of the first object that has the index, whose keys are those of every object that refers to it (the lists
 *   are numbered again by the grouping, which tells the records the new position). The top bit of `n` ({@link BARE_FLAG}) says so
 *   of a record, since the index of an array has its keys, and the two kinds are separate records even for the same keys.
 * - A region that was never written has the empty value in it: a root that is an empty object.
 * - When bit 5 of the variant is set, the encoder numbered the nodes of the region by their tag, then by the count in `b`, then
 *   by `c` and `a` as the walk had them (`group.ts`), and the lists are in the order of the first node that has them. The
 *   words of a list are the same ones with the numbers of the nodes that moved, and the root is the new number of the root. The
 *   strings and the indexes are what they were.
 *
 * **A region that a composition changes** is appended to: what an extension changes is added to it, and what it does not
 * change is the nodes that were there. The rules, which the TypeScript (`compose.ts`, `lazy.ts`) and the Rust composition
 * follow to the same bytes:
 *
 * - The tree that is to be encoded has, for what the merge left as it was, a **reference** to its node in the region, and
 *   for the rest values. Only an array or an object (an empty one too) is a reference; a number, a boolean, null and a string are
 *   always values, so that they are made as new nodes.
 * - A new node, list and index is added at the end of the sections of the region, and its number goes on from the count
 *   that the region had (`nodes`, `lists`, `indexes`); a reference is the number that it has, and makes nothing. The numbers
 *   are given in the order of the walk of `encode.ts` (a node after what it refers to). A node and a list that is the same as a
 *   new one that was made earlier is not made again; one that is the same as a node or a list of the base is, since the
 *   base does not say which they are. An index is the same as one that the region had when the string numbers of its keys are the same:
 *   the indexes of the region are walked from the start to know them (a record is `2 + n + entries` words for a sorted index and
 *   `5 + ceil(buckets / 2) + slots + entries` for a perfect hash, from the counts at its start, and with one word in place of the
 *   `entries` when its top bit of `n` says it has no keys), and the first of those that have the same keys is the one that is used.
 *   For a candidate whose indexes of objects have no keys, an index is looked for among those of its own kind (an array or an
 *   object), the keys of a record without keys are read from the list that its last word names, and the record is the same only
 *   for the same kind.
 * - The root of the region is the new node of the tree (the node of the reference when the tree is one). The count of the nodes, lists
 *   and indexes in its header are those of the region with the new ones. The nodes that the old root had stay where they are.
 * - A region of columns has the columns made again for the new count of nodes (field `f` of node `n` is at `f * count + n`).
 * - The strings of the base keep their numbers and the new ones go after them, in the order that the regions are
 *   made (`specs`, `#globalAttrs`, `#aria`, `#contentModels`, the rest).
 *
 * What a candidate does not hold: a number that is negative, not an integer, or 2^32 or more (the data has none; the encoder
 * stops for one), and the keys of `def` other than the three that `SpecDefs` has.
 *
 * @module
 */
import { FLAG_NAMES } from '../layout.ts';

/** The first word of a file, the bytes "MLSP". */
export const MAGIC = 0x50_53_4c_4d;

/** The version of the format. */
export const VERSION = 1;

/** How many sections a file has. */
export const SECTION_COUNT = 8;

/** Where the sections are in the table. */
export const Section = {
	StringOffsets: 0,
	StringBytes: 1,
	Bits: 2,
	Specs: 3,
	GlobalAttrs: 4,
	Aria: 5,
	ContentModels: 6,
	Rest: 7,
} as const;

/** The sections that are regions, in the order of the sections. */
export const REGIONS = [Section.Specs, Section.GlobalAttrs, Section.Aria, Section.ContentModels, Section.Rest] as const;

/** The position of each region in {@link REGIONS}, which is how a spec and a question name it. */
export const RegionAt = { Specs: 0, GlobalAttrs: 1, Aria: 2, ContentModels: 3, Rest: 4 } as const;

/** The words before the first section: the magic, the version, the variant, the count, and the table. */
export const HEADER_WORDS = 4 + 2 * SECTION_COUNT;

/** The tag of a node. */
export const Tag = {
	Null: 0,
	False: 1,
	True: 2,
	Uint: 3,
	String: 4,
	Array: 5,
	Object: 6,
} as const;

/** The words of a node. */
export const NODE_WORDS = 4;

/** The marker of a slot that holds no key, and of a position that is not found. */
export const NONE = 0xff_ff_ff_ff;

/** An array of objects with a `name`, and an object, have an index from this many items or keys. */
export const INDEX_MINIMUM = 8;

/** The flags of an element, in the order of the bits of a flag word (the flags of `layout.ts`, which asks the same questions of the bits). */
export const FLAGS = FLAG_NAMES;

/** How an index finds a position. */
export type IndexKind = 'sorted' | 'minimal' | 'pow2';

/** Which hash function a perfect hash uses. */
export type HashKind = 'murmur3' | 'xxhash32';

/** What differs between the candidates. */
export interface Variant {
	/** Arrays of a region in columns (`true`) or in rows. */
	readonly columns: boolean;
	readonly index: IndexKind;
	readonly hash: HashKind;
	/**
	 * The nodes of a region the encoder makes from a spec are numbered by their tag, then by how many items or entries they
	 * have, instead of in the order of the walk (`group.ts`). Only an encoder is told by this, and a reader does not use it:
	 * the bit of the header is there so that a file says how it was made. A composition appends, and does not group.
	 */
	readonly grouped?: boolean;
	/**
	 * A slot of a perfect hash that no key has is 0 and the others are the position of their key plus one, in place of {@link NONE}
	 * and the position. A reader takes a slot that is 0 for none, and the rest minus one for the position.
	 */
	readonly zero?: boolean;
	/**
	 * The table of the offsets of the strings holds them in 16 bits, two to a word, after the count of the strings (the strings
	 * are 65,535 bytes or fewer: a spec that has more is written with 32 bits, and a variant that comes back from a file says
	 * which). It is a choice of the reader as well as of the encoder.
	 */
	readonly narrow?: boolean;
	/**
	 * The index of an object has no key of each entry (the index of an array has them): a lookup compares the name that it was
	 * asked with the key that the list of the object holds at the position that the slot gave. Only a perfect hash has it.
	 */
	readonly bare?: boolean;
}

const INDEX_CODES: readonly IndexKind[] = ['sorted', 'minimal', 'pow2'];

/** The bit of the variant word that says the nodes are grouped (bit 4 is not used). */
const GROUPED_BIT = 5;

/** The bit of the variant word that says a slot of a perfect hash is 0 for none. */
const ZERO_BIT = 6;

/** The bit of the variant word that says the offsets of the strings are 16 bits. */
const NARROW_BIT = 7;

/** The bit of the variant word that says the indexes of objects have no keys. */
const BARE_BIT = 8;

/** The strings of a table of 16-bit offsets are this many bytes or fewer. */
export const NARROW_LIMIT = 0xff_ff;

/** The bit of the second word of an index that says it has no keys (the rest of the word is how many different keys it has). */
export const BARE_FLAG = 0x80_00_00_00;

/**
 * The word of the header that holds a variant.
 *
 * @param variant - The variant
 * @returns The word
 */
export function variantWord(variant: Variant): number {
	return (
		(variant.columns ? 1 : 0) |
		(INDEX_CODES.indexOf(variant.index) << 1) |
		((variant.hash === 'xxhash32' ? 1 : 0) << 3) |
		((variant.grouped ? 1 : 0) << GROUPED_BIT) |
		((variant.zero ? 1 : 0) << ZERO_BIT) |
		((variant.narrow ? 1 : 0) << NARROW_BIT) |
		((variant.bare ? 1 : 0) << BARE_BIT)
	);
}

/**
 * The variant that a word of the header holds. A choice that is not made is not in the variant, so that a variant that
 * comes back from a word is the one that the word was made from.
 *
 * @param word - The word
 * @returns The variant
 * @throws When the word holds a number that is not a variant
 */
export function variantOf(word: number): Variant {
	const index = INDEX_CODES[(word >>> 1) & 3];
	// A sorted index has no slot (zero) and has keys that a lookup compares in the record (bare), as the encoder knows
	const asksOfPerfectHash = ((word >>> ZERO_BIT) & 1) === 1 || ((word >>> BARE_BIT) & 1) === 1;
	if (
		index === undefined ||
		((word >>> 4) & 1) !== 0 ||
		word >>> (BARE_BIT + 1) !== 0 ||
		(index === 'sorted' && asksOfPerfectHash)
	) {
		throw new Error(`The variant 0x${word.toString(16)} is not one of the candidates`);
	}
	return {
		columns: (word & 1) === 1,
		index,
		hash: ((word >>> 3) & 1) === 1 ? 'xxhash32' : 'murmur3',
		...(((word >>> GROUPED_BIT) & 1) === 1 ? { grouped: true } : {}),
		...(((word >>> ZERO_BIT) & 1) === 1 ? { zero: true } : {}),
		...(((word >>> NARROW_BIT) & 1) === 1 ? { narrow: true } : {}),
		...(((word >>> BARE_BIT) & 1) === 1 ? { bare: true } : {}),
	};
}

/**
 * Stops for a candidate that no file can have: a sorted index has no slot to write as 0 and keeps the keys that a lookup compares
 * in its own record. The reader refuses a header that asks for either (`variantOf`), so the encoder does not write one.
 *
 * @param variant - The candidate
 * @throws For a sorted index with `zero` or `bare`
 */
export function assertCandidate(variant: Variant): void {
	if (variant.index === 'sorted' && variant.bare) {
		throw new Error(
			'An index without keys needs a perfect hash, which gives the position that the key is then read at',
		);
	}
	if (variant.index === 'sorted' && variant.zero) {
		throw new Error('An empty slot is a slot of a perfect hash, and a sorted index has none');
	}
}

/**
 * The name of a variant, for a table.
 *
 * @param variant - The variant
 * @returns For example `columns/minimal/murmur3`, and `rows/pow2/murmur3+grouped+zero`
 */
export function variantName(variant: Variant): string {
	const choices = ['grouped', 'zero', 'narrow', 'bare'] as const;
	return `${variant.columns ? 'columns' : 'rows'}/${variant.index}/${variant.hash}${choices.map(choice => (variant[choice] ? `+${choice}` : '')).join('')}`;
}

/**
 * The candidates that are measured, in three groups: the two arrangements and the three indexes with Murmur3, and the perfect
 * hashes with xxHash32 (ten); the two arrangements of a perfect hash of a power of two with Murmur3, with the order of the
 * nodes and the empty slot chosen in each way (six); and, with the nodes grouped and the empty slot 0, the offsets of the
 * strings in 16 bits and the indexes of objects without keys, each and both in columns, and the indexes without keys in rows
 * (four).
 */
export const VARIANTS: readonly Variant[] = [
	...[false, true].flatMap(columns => [
		{ columns, index: 'sorted', hash: 'murmur3' } as const,
		{ columns, index: 'minimal', hash: 'murmur3' } as const,
		{ columns, index: 'pow2', hash: 'murmur3' } as const,
		{ columns, index: 'minimal', hash: 'xxhash32' } as const,
		{ columns, index: 'pow2', hash: 'xxhash32' } as const,
	]),
	...[{ grouped: true }, { zero: true }, { grouped: true, zero: true }].flatMap(choices =>
		[false, true].map(columns => ({ columns, index: 'pow2', hash: 'murmur3', ...choices }) as const),
	),
	// The third group, with the nodes grouped and the empty slot 0. The first three are in columns, which was the smallest of the
	// second group by Brotli; the last is the same as the second of them in rows, and it is the form that is adopted (the first
	// paragraph above).
	...[{ narrow: true }, { bare: true }, { narrow: true, bare: true }].map(
		choices => ({ columns: true, index: 'pow2', hash: 'murmur3', grouped: true, zero: true, ...choices }) as const,
	),
	{ columns: false, index: 'pow2', hash: 'murmur3', grouped: true, zero: true, bare: true } as const,
];
