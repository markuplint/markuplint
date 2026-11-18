/**
 * The layout of the packed candidates: what a file holds, word by word. It is the one description of the format; the
 * encoder (`encode.ts`), the reader (`read.ts`) and the Rust program
 * (`crates/markuplint-types/examples/packed_candidates/`) follow it, and a candidate that this side builds is read there
 * byte for byte.
 *
 * What the candidates are, and what is the same in all of them (issue #4639):
 *
 * - The data is the JSON of `@markuplint/html-spec` as a tree of values (null, booleans, non-negative integers, strings,
 *   arrays, objects) in 32-bit little-endian words that a reader indexes into without copying and without parsing.
 *   A subtree that is identical to another is stored once (the tree of 50,268 nodes of the data is 4,158 distinct
 *   subtrees), and a list of children that is identical to another is stored once.
 * - Every string is in one table (UTF-8 bytes and the offsets of each), and a node refers to it by number. A string
 *   is added at the end of the table when a spec is composed, so a number never changes.
 * - The tree is cut at the keys of the spec into **regions**: `specs`, `def['#globalAttrs']`, `def['#aria']`,
 *   `def['#contentModels']`, and the rest. A region has its own nodes, lists and indexes, and refers to other regions by
 *   nothing but string numbers. A spec that is composed with an extension makes again the regions that the extension
 *   touches and shares the others as they are.
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
 * two so that a lookup needs no division), and which hash function a perfect hash uses.
 *
 * A file, in words (everything is little-endian, and a number is `uint32`):
 *
 * ```text
 * 0       magic            0x50534c4d (the bytes "MLSP")
 * 1       version          1
 * 2       variant          bit 0 columns; bits 1-2 the index (0 sorted, 1 minimal, 2 power of two); bit 3 the hash (0 Murmur3, 1 xxHash32)
 * 3       sections         8
 * 4..19   section table    for each section: the offset in words from the start of the file, and the length in words
 * ...     sections
 * last    checksum         CRC-32C of every word before it
 * ```
 *
 * The sections, in the order of the table:
 *
 * ```text
 * 0 string offsets   count + 1 offsets in bytes into section 1 (the first is 0, the last is the length)
 * 1 string bytes     UTF-8, padded to whole words with zero bytes
 * 2 bits             elements, categories, wordsPerRow; then one word of flags for each element (bit i is FLAG_NAMES[i]),
 *                    then wordsPerRow words for each category (the bit e of row c is set when the element at position e of
 *                    `specs` is a member of the category at position c of `#contentModels`, by exactly its name)
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
 *   (see `mphf.ts`; the pilots are 16 bits each and two are in a word; a slot that no key has holds {@link NONE}). `n` is the
 *   number of different keys: the keys are the names of an array's objects or the keys of an object, and a name that comes
 *   twice is indexed at its first position.
 * - A region that was never written has the empty value in it: a root that is an empty object.
 *
 * **A region that a composition changes** is not made again: what an extension changes is appended to it, and what it does not change is
 * the nodes that were there. The rules, which the TypeScript (`compose.ts`, `lazy.ts`) and the Rust composition follow to the same bytes:
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
 *   `5 + ceil(buckets / 2) + slots + entries` for a perfect hash, from the counts at its start), and the first of those that have
 *   the same keys is the one that is used.
 * - The root of the region is the new node of the tree (the node of the reference when the tree is one). The count of the nodes, lists
 *   and indexes in its header are those of the region with the new ones. The nodes that the old root had stay where they are.
 * - A region of columns has the columns made again for the new count of nodes (field `f` of node `n` is at `f * count + n`).
 * - The strings of the base keep their numbers and the new ones go after them, in the order that the regions are
 *   made (`specs`, `#globalAttrs`, `#aria`, `#contentModels`, the rest), as before.
 *
 * What a candidate does not hold: a number that is negative, not an integer, or 2^32 or more (the data has none; the encoder
 * stops for one), and the keys of `def` other than the three that `SpecDefs` has.
 *
 * @module
 */

/** The first word of a file, the bytes "MLSP". */
export const MAGIC = 0x50_53_4C_4D;

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
export const NONE = 0xFF_FF_FF_FF;

/** An array of objects with a `name`, and an object, have an index from this many items or keys. */
export const INDEX_MINIMUM = 8;

/** The flags of an element, in the order of the bits of a flag word. */
export const FLAGS = ['obsolete', 'deprecated', 'nonStandard', 'experimental'] as const;

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
}

const INDEX_CODES: readonly IndexKind[] = ['sorted', 'minimal', 'pow2'];

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
		((variant.hash === 'xxhash32' ? 1 : 0) << 3)
	);
}

/**
 * The variant that a word of the header holds.
 *
 * @param word - The word
 * @returns The variant
 * @throws When the word holds a number that is not a variant
 */
export function variantOf(word: number): Variant {
	const index = INDEX_CODES[(word >>> 1) & 3];
	if (index === undefined || word >>> 4 !== 0) {
		throw new Error(`The variant 0x${word.toString(16)} is not one of the candidates`);
	}
	return { columns: (word & 1) === 1, index, hash: ((word >>> 3) & 1) === 1 ? 'xxhash32' : 'murmur3' };
}

/**
 * The name of a variant, for a table.
 *
 * @param variant - The variant
 * @returns For example `columns/minimal/murmur3`
 */
export function variantName(variant: Variant): string {
	return `${variant.columns ? 'columns' : 'rows'}/${variant.index}/${variant.hash}`;
}

/**
 * The candidates that are measured: the two arrangements and the three indexes with Murmur3, and the perfect hashes with
 * xxHash32.
 */
export const VARIANTS: readonly Variant[] = [false, true].flatMap(columns => [
	{ columns, index: 'sorted', hash: 'murmur3' } as const,
	{ columns, index: 'minimal', hash: 'murmur3' } as const,
	{ columns, index: 'pow2', hash: 'murmur3' } as const,
	{ columns, index: 'minimal', hash: 'xxhash32' } as const,
	{ columns, index: 'pow2', hash: 'xxhash32' } as const,
]);
