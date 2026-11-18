import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { describe, expect, test } from 'vitest';

import { schemaToSpec } from '@markuplint/ml-spec';

import { compose, type ExtensionLike } from './compose.ts';
import { StringTable, encodeSpec, indexesOf, type SpecLike } from './encode.ts';
import { EXTENSIONS } from './extensions.ts';
import {
	BARE_FLAG,
	INDEX_MINIMUM,
	NARROW_LIMIT,
	NONE,
	RegionAt,
	Section,
	Tag,
	VARIANTS,
	type Variant,
} from './format.ts';
import { crc32cWords } from './hash.ts';
import { PackedSpec, Region, wordsOf } from './read.ts';

const SPEC = JSON.parse(
	readFileSync(new URL('../../../packages/@markuplint/html-spec/index.json', import.meta.url), 'utf8'),
) as SpecLike;

const find = (narrow: boolean, bare: boolean): Variant => {
	const variant = VARIANTS.find(
		candidate =>
			candidate.columns &&
			candidate.index === 'pow2' &&
			candidate.hash === 'murmur3' &&
			candidate.grouped === true &&
			candidate.zero === true &&
			Boolean(candidate.narrow) === narrow &&
			Boolean(candidate.bare) === bare,
	);
	if (!variant) {
		throw new Error(`no candidate (narrow ${narrow}, bare ${bare})`);
	}
	return variant;
};

const WIDE = find(false, false);
const NARROW = find(true, false);
const BARE = find(false, true);
const BOTH = find(true, true);

const lengthOf = (variant: Variant): number => encodeSpec(SPEC, variant).serialize().byteLength;

/** How many bytes the strings of a spec are. */
const stringBytesOf = (packed: PackedSpec): number => packed.stringByteLength;

/**
 * An extension whose strings pass 65,535 bytes with those of a spec that has `stringBytes` (an element that the base lacks is
 * dropped by `schemaToSpec`, so what it adds goes to an element that the base has).
 */
function bigExtension(stringBytes: number): ExtensionLike {
	return {
		specs: [
			{
				name: 'div',
				attributes: { 'x-big-attr': { type: 'Any', cite: 'x'.repeat(NARROW_LIMIT - stringBytes + 100) } },
			},
		],
	};
}

/** An extension that adds a few strings. */
const SMALL_EXTENSION: ExtensionLike = {
	specs: [{ name: 'div', attributes: { 'x-small-attr': { type: 'Boolean' } } }],
};

/**
 * A spec whose strings are exactly this many bytes: an element with a `cite` of the length that makes up the difference.
 *
 * @param total - How many bytes the strings are
 * @returns The spec
 */
function specWithStringBytes(total: number): SpecLike {
	const def = { '#globalAttrs': {}, '#aria': {}, '#contentModels': {} };
	// `schemaToSpec` spreads the attributes of an element and gives it `globalAttrs`, so the element has both, as those of `html-spec` do
	const without = stringBytesOf(
		encodeSpec({ def, specs: [{ name: 'a', cite: '', attributes: {}, globalAttrs: {} }] }, WIDE),
	);
	return { def, specs: [{ name: 'a', cite: 'x'.repeat(total - without), attributes: {}, globalAttrs: {} }] };
}

/** How many records the indexes of a region have. */
function recordCount(indexes: Uint32Array): number {
	let count = 0;
	let at = 0;
	while (at < indexes.length) {
		const entries = indexes[at] ?? 0;
		const marked = indexes[at + 1] ?? 0;
		at +=
			5 +
			Math.ceil((indexes[at + 3] ?? 0) / 2) +
			(indexes[at + 4] ?? 0) +
			((marked & BARE_FLAG) === 0 ? entries : 1);
		count++;
	}
	expect(at, 'the records end where the indexes end').toBe(indexes.length);
	return count;
}

/** A copy of the words of a file that is changed, with the checksum that the changed words have. */
function changed(words: Uint32Array, change: (copy: Uint32Array, offsetsAt: number) => void): Uint32Array {
	const copy = Uint32Array.from(words);
	change(copy, copy[4 + 2 * Section.StringOffsets] ?? 0);
	copy[copy.length - 1] = crc32cWords(copy, copy.length - 1);
	return copy;
}

describe('the smaller candidates', () => {
	test('hold the same data in smaller files', () => {
		for (const variant of [NARROW, BARE, BOTH]) {
			expect(isDeepStrictEqual(encodeSpec(SPEC, variant).toJson(), SPEC)).toBe(true);
		}
		const count = encodeSpec(SPEC, WIDE).stringCount;
		// The offsets of the strings are half the bytes, a word less the count
		expect(lengthOf(WIDE) - lengthOf(NARROW)).toBeGreaterThanOrEqual(count);
		expect(lengthOf(BARE)).toBeLessThan(lengthOf(WIDE));
		expect(lengthOf(BOTH)).toBeLessThan(lengthOf(NARROW));
	});
});

describe('the offsets of the strings in 16 bits', () => {
	const wide = encodeSpec(SPEC, WIDE);
	const narrow = encodeSpec(SPEC, NARROW);

	test('are the count of the strings and the offsets two to a word', () => {
		const offsets = narrow.sections[Section.StringOffsets];
		expect(offsets?.[0]).toBe(wide.stringCount);
		expect(offsets?.length).toBe(1 + Math.ceil((wide.stringCount + 1) / 2));
	});

	test('give every string its bytes', () => {
		expect(narrow.stringCount).toBe(wide.stringCount);
		for (let sid = 0; sid < wide.stringCount; sid++) {
			expect(narrow.stringAt(sid)).toBe(wide.stringAt(sid));
		}
	});

	test('are read back from the words of a file', () => {
		const opened = PackedSpec.open(wordsOf(new Uint8Array(narrow.serialize().buffer)));
		expect(opened.variant).toStrictEqual(NARROW);
		expect(opened.toJson()).toStrictEqual(SPEC);
	});

	test('are widened, as the data is, when the strings are more than 65,535 bytes: a spec that holds them is not refused', () => {
		const spec = specWithStringBytes(NARROW_LIMIT + 1);
		const packed = encodeSpec(spec, NARROW);
		expect(packed.variant.narrow).toBeFalsy();
		// A boolean, since the difference of two such strings is not a message that anyone reads
		expect(isDeepStrictEqual(packed.toJson(), spec)).toBe(true);
		const opened = PackedSpec.open(wordsOf(new Uint8Array(packed.serialize().buffer)));
		expect(opened.variant.narrow).toBeFalsy();
		expect(isDeepStrictEqual(opened.toJson(), spec)).toBe(true);
	});

	test('stay in 16 bits when the strings are exactly 65,535 bytes', () => {
		const spec = specWithStringBytes(NARROW_LIMIT);
		const packed = encodeSpec(spec, NARROW);
		expect(stringBytesOf(packed)).toBe(NARROW_LIMIT);
		expect(packed.variant.narrow).toBe(true);
		expect(isDeepStrictEqual(packed.toJson(), spec)).toBe(true);
	});

	test('are widened by a composition whose strings pass that count, and the strings of the base keep their numbers', () => {
		const extension = bigExtension(stringBytesOf(narrow));
		const composed = compose(narrow, [extension]);
		expect(composed.variant.narrow).toBeFalsy();
		// eslint-disable-next-line unicorn/prefer-structured-clone -- the text is what is handed over, and it drops an `undefined`
		const expected = JSON.parse(JSON.stringify(schemaToSpec([SPEC as never, extension as never]))) as unknown;
		expect(isDeepStrictEqual(composed.toJson(), expected)).toBe(true);
		for (let sid = 0; sid < narrow.stringCount; sid++) {
			expect(composed.stringAt(sid)).toBe(narrow.stringAt(sid));
		}
		const opened = PackedSpec.open(wordsOf(new Uint8Array(composed.serialize().buffer)));
		expect(isDeepStrictEqual(opened.toJson(), expected)).toBe(true);
	});

	test('stay in 16 bits for a composition that lands on 65,535 bytes, and are widened by one byte more', () => {
		const base = encodeSpec(specWithStringBytes(NARROW_LIMIT - 10), NARROW);
		const adding = (bytes: number): ExtensionLike => ({
			specs: [{ name: 'a', cite: 'y'.repeat(bytes), attributes: {}, globalAttrs: {} }],
		});
		const lands = compose(base, [adding(10)]);
		expect(stringBytesOf(lands)).toBe(NARROW_LIMIT);
		expect(lands.variant.narrow).toBe(true);
		const passes = compose(base, [adding(11)]);
		expect(stringBytesOf(passes)).toBe(NARROW_LIMIT + 1);
		expect(passes.variant.narrow).toBeFalsy();
	});

	test('stay in 16 bits for a composition that keeps within them', () => {
		const composed = compose(narrow, [SMALL_EXTENSION]);
		expect(composed.variant.narrow).toBe(true);
		expect(composed.stringCount).toBeGreaterThan(narrow.stringCount);
		expect(composed.stringId('x-small-attr')).toBeGreaterThanOrEqual(narrow.stringCount);
	});

	test('are refused by a table of strings that continues a spec, which has the offsets that the spec has', () => {
		expect(() => new StringTable(wide, true)).toThrow(/has the offsets that the spec has/u);
		expect(() => new StringTable(narrow, false)).toThrow(/has the offsets that the spec has/u);
		expect(() => new StringTable(narrow)).not.toThrow();
	});

	test('are refused by a file whose count is more than the offsets that it holds', () => {
		const words = changed(narrow.serialize(), (copy, offsetsAt) => {
			copy[offsetsAt] = (copy[offsetsAt] ?? 0) + 4;
		});
		expect(() => PackedSpec.open(words)).toThrow(/not as long as the count of the strings says/u);
	});

	test('are refused by a file whose first offset is not 0', () => {
		const words = changed(narrow.serialize(), (copy, offsetsAt) => {
			new Uint16Array(copy.buffer, (offsetsAt + 1) * 4, 2)[0] = 1;
		});
		expect(() => PackedSpec.open(words)).toThrow(/does not start at 0/u);
	});

	test('are refused by a file whose offsets are not in order', () => {
		const words = changed(narrow.serialize(), (copy, offsetsAt) => {
			new Uint16Array(copy.buffer, (offsetsAt + 1) * 4, 3)[2] = 0;
		});
		expect(() => PackedSpec.open(words)).toThrow(/is not in order/u);
	});
});

describe('the indexes of objects without their keys', () => {
	const packed = encodeSpec(SPEC, BARE);

	test('find the entry of every key of every object that has an index, and no key that it lacks', () => {
		let checked = 0;
		for (const region of packed.regions) {
			for (let node = 0; node < region.count; node++) {
				if (region.tag(node) !== Tag.Object || region.b(node) < INDEX_MINIMUM) {
					continue;
				}
				expect(region.c(node), 'an object of that many keys has an index').not.toBe(0);
				for (let j = 0; j < region.b(node); j++) {
					const key = packed.stringAt(packed.keyAt(region, node, j));
					expect(packed.entry(region, node, key)).toBe(j);
					checked++;
				}
				expect(packed.entry(region, node, 'no-such-key\u0000')).toBe(NONE);
			}
		}
		expect(checked).toBeGreaterThan(1000);
	});

	/** The position of the list that each record without keys refers to, by the position of the record, in a region. */
	function listsOfRecords(region: Region): Map<number, { entries: number; listAt: number }> {
		const found = new Map<number, { entries: number; listAt: number }>();
		let at = 0;
		while (at < region.indexes.length) {
			const entries = region.indexes[at] ?? 0;
			const bare = ((region.indexes[at + 1] ?? 0) & BARE_FLAG) !== 0;
			const length =
				5 + Math.ceil((region.indexes[at + 3] ?? 0) / 2) + (region.indexes[at + 4] ?? 0) + (bare ? 1 : entries);
			if (bare) {
				found.set(at, { entries, listAt: region.indexes[at + length - 1] ?? 0 });
			}
			at += length;
		}
		expect(at, 'the records end where the indexes end').toBe(region.indexes.length);
		return found;
	}

	test('are walked from the first as records, each of which says whether it has its keys', () => {
		const flagged: boolean[] = [];
		for (const region of packed.regions) {
			let at = 0;
			while (at < region.indexes.length) {
				const entries = region.indexes[at] ?? 0;
				const bare = ((region.indexes[at + 1] ?? 0) & BARE_FLAG) !== 0;
				at +=
					5 +
					Math.ceil((region.indexes[at + 3] ?? 0) / 2) +
					(region.indexes[at + 4] ?? 0) +
					(bare ? 1 : entries);
				flagged.push(bare);
			}
			expect(at, 'the records end where the indexes end').toBe(region.indexes.length);
		}
		expect(flagged).toContain(true);
		expect(flagged).toContain(false);
	});

	test('say where the list of an object that has their keys is, which every object that refers to them shares in its keys', () => {
		let checked = 0;
		for (const [position, region] of packed.regions.entries()) {
			const records = listsOfRecords(region);
			for (let node = 0; node < region.count; node++) {
				const record = region.c(node) === 0 ? undefined : records.get(region.c(node) - 1);
				if (region.tag(node) !== Tag.Object || !record) {
					continue;
				}
				expect(record.entries, `region ${position}`).toBe(region.b(node));
				for (let j = 0; j < record.entries; j++) {
					// The keys of the list that the record names, in columns
					expect(region.lists[record.listAt + j], `region ${position}`).toBe(packed.keyAt(region, node, j));
					checked++;
				}
			}
		}
		expect(checked).toBeGreaterThan(1000);
	});

	test('are refused for a candidate that has no perfect hash, which cannot say where the key of a slot is', () => {
		expect(() => encodeSpec(SPEC, { columns: false, index: 'sorted', hash: 'murmur3', bare: true })).toThrow(
			/perfect hash/u,
		);
	});

	test('are refused for such a candidate also when the spec has no index to write', () => {
		expect(() =>
			encodeSpec({ specs: [] }, { columns: false, index: 'sorted', hash: 'murmur3', bare: true }),
		).toThrow(/perfect hash/u);
	});

	test('are refused in a region where one refers to a list that the region does not have', () => {
		const section = Uint32Array.from(packed.sections[Section.Aria] ?? []);
		const count = section[0] ?? 0;
		const listWords = section[1] ?? 0;
		const indexesAt = 4 + 4 * count + listWords;
		const region = new Region(section, true);
		const [first] = [...listsOfRecords(region).keys()];
		expect(first, 'the region has an index without keys').toBeDefined();
		const at = first ?? 0;
		const length = 5 + Math.ceil((section[indexesAt + at + 3] ?? 0) / 2) + (section[indexesAt + at + 4] ?? 0) + 1;
		// The last word of the record is the position of a list: a position past the lists
		section[indexesAt + at + length - 1] = listWords;
		expect(() => indexesOf(new Region(section, true), BARE)).toThrow(
			/refers to a list at \d+ that the region does not have/u,
		);
	});

	test.each(['vue', 'user', 'rich'])('are found in the objects that a composition appends, with %s', name => {
		const composed = compose(packed, [EXTENSIONS[name] as ExtensionLike]);
		let checked = 0;
		for (const [position, region] of composed.regions.entries()) {
			for (let node = 0; node < region.count; node++) {
				if (region.tag(node) !== Tag.Object || region.c(node) === 0) {
					continue;
				}
				for (let j = 0; j < region.b(node); j++) {
					const key = composed.stringAt(composed.keyAt(region, node, j));
					expect(composed.entry(region, node, key), `region ${position}`).toBe(j);
					checked++;
				}
			}
		}
		expect(checked).toBeGreaterThan(1000);
	});

	test('are made once by a composition, which finds the index of an object that has the keys of one the region has', () => {
		const extension: ExtensionLike = {
			specs: [
				{
					name: 'div',
					attributes: Object.fromEntries(
						Array.from({ length: INDEX_MINIMUM + 1 }, (_, i) => [`x-n${i}`, { type: 'Boolean' }]),
					),
				},
			],
		};
		const once = compose(packed, [extension]);
		const twice = compose(once, [extension]);
		const records = (spec: PackedSpec): number =>
			recordCount(spec.regions[RegionAt.Specs]?.indexes ?? new Uint32Array(0));
		// The keys of the attributes of `div` are new, and the second composition has the same keys as the first
		expect(records(once)).toBeGreaterThan(records(packed));
		expect(records(twice)).toBe(records(once));
		expect(isDeepStrictEqual(twice.toJson(), once.toJson())).toBe(true);
	});
});

describe('a composition of the smaller candidates', () => {
	test.each([NARROW, BARE, BOTH])('means what schemaToSpec says (%o)', variant => {
		const extension: ExtensionLike = {
			specs: [{ name: 'div', attributes: { a: { type: 'Any' } } }],
			def: { '#contentModels': { '#custom': ['div'] } },
		};
		// eslint-disable-next-line unicorn/prefer-structured-clone -- the text is what is handed over, and it drops an `undefined`
		const expected = JSON.parse(JSON.stringify(schemaToSpec([SPEC as never, extension as never]))) as unknown;
		expect(isDeepStrictEqual(compose(encodeSpec(SPEC, variant), [extension]).toJson(), expected)).toBe(true);
	});
});
