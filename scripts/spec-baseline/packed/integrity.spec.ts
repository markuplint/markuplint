import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { encodeSpec, type SpecLike } from './encode.ts';
import { INDEX_MINIMUM, NONE, Section, VARIANTS, variantOf, variantWord } from './format.ts';
import { crc32cWords } from './hash.ts';
import { PackedSpec } from './read.ts';

const SMALL = JSON.parse(readFileSync(new URL('fixtures/small-spec.json', import.meta.url), 'utf8')) as SpecLike;

const VARIANT = VARIANTS[1];
if (!VARIANT) {
	throw new Error('no candidate');
}

/** The file with the checksum that its words have, so that what `open` refuses is the shape of the file and not the checksum. */
function sealed(words: Uint32Array): Uint32Array {
	words[words.length - 1] = crc32cWords(words, words.length - 1);
	return words;
}

const original = encodeSpec(SMALL, VARIANT).serialize();

/** A copy of the file that is changed, with the checksum that the changed words have. */
function changed(change: (words: Uint32Array, where: (section: number) => number) => void): Uint32Array {
	const words = Uint32Array.from(original);
	change(words, section => words[4 + 2 * section] ?? 0);
	return sealed(words);
}

describe('a file whose checksum is right and whose shape is not', () => {
	test.each([
		[
			'a number of sections that is not 8',
			(words: Uint32Array) => {
				words[3] = 7;
			},
			'has 7 sections, not 8',
		],
		[
			'words between the last section and the checksum',
			(words: Uint32Array) => {
				words[5 + 2 * Section.Rest] = (words[5 + 2 * Section.Rest] ?? 0) - 1;
			},
			'between the last section and the checksum',
		],
		[
			'a variant that has an index that no candidate has (0b0110)',
			(words: Uint32Array) => {
				words[2] = 0b0110;
			},
			'is not one of the candidates',
		],
		[
			'a variant with a bit that no candidate has (0x10)',
			(words: Uint32Array) => {
				words[2] = 0x10;
			},
			'is not one of the candidates',
		],
		[
			'a region that is longer than its header says',
			(words: Uint32Array, where: (section: number) => number) => {
				words[where(Section.Specs)] = (words[where(Section.Specs)] ?? 0) + 1;
			},
			'A region is not as long as its header says',
		],
		[
			'a root that is not a node of its region',
			(words: Uint32Array, where: (section: number) => number) => {
				words[where(Section.Aria) + 3] = words[where(Section.Aria)] ?? 0;
			},
			'The root of a region is not a node of it',
		],
		[
			'a table of string offsets that does not start at 0',
			(words: Uint32Array, where: (section: number) => number) => {
				words[where(Section.StringOffsets)] = 1;
			},
			'does not start at 0',
		],
		[
			'a table of string offsets that is not in order',
			(words: Uint32Array, where: (section: number) => number) => {
				const at = where(Section.StringOffsets) + 2;
				words[at] = (words[at - 1] ?? 0) - 1;
			},
			'is not in order',
		],
		[
			'string bytes that are shorter than the offsets say',
			(words: Uint32Array, where: (section: number) => number) => {
				const length = words[5 + 2 * Section.StringOffsets] ?? 0;
				const at = where(Section.StringOffsets) + length - 1;
				words[at] = (words[at] ?? 0) + 100;
			},
			'not as long as their offsets say',
		],
	])('is refused for %s, with the reason', (_name, change, message) => {
		expect(() => PackedSpec.open(changed(change))).toThrow(message);
	});

	test('is a file that is accepted when nothing is changed (the checksum is made as an encoder makes it)', () => {
		expect(() => PackedSpec.open(changed(() => {}))).not.toThrow();
	});
});

describe('variantOf', () => {
	test('gives back the variant of every word that variantWord makes, and refuses a word that is no candidate', () => {
		for (const variant of VARIANTS) {
			expect(variantOf(variantWord(variant))).toStrictEqual(variant);
		}
		expect(() => variantOf(0b0110)).toThrow('is not one of the candidates');
		expect(() => variantOf(0x10)).toThrow('is not one of the candidates');
	});
});

describe('replace', () => {
	const base = PackedSpec.open(original);

	test('refuses a table of strings that is shorter than the one that it replaces', () => {
		expect(() =>
			base.replace({
				[Section.StringOffsets]: base.sections[Section.StringOffsets]?.subarray(0, 2) ?? new Uint32Array(0),
			}),
		).toThrow('is shorter than the one it replaces');
	});

	test('refuses offsets that do not continue those of the table that it replaces', () => {
		const offsets = Uint32Array.from(base.sections[Section.StringOffsets] ?? []);
		offsets[1] = (offsets[1] ?? 0) + 1;
		expect(() => base.replace({ [Section.StringOffsets]: offsets })).toThrow(
			'does not continue the one it replaces',
		);
	});

	test('refuses bytes that do not continue the bytes of the table that it replaces', () => {
		const bytes = Uint32Array.from(base.sections[Section.StringBytes] ?? []);
		bytes[0] = ((bytes[0] ?? 0) ^ 1) >>> 0;
		expect(() => base.replace({ [Section.StringBytes]: bytes })).toThrow(
			'string bytes does not continue the one it replaces',
		);
		expect(() => base.replace({ [Section.StringBytes]: bytes.subarray(0, 1) })).toThrow(
			'string bytes does not continue the one it replaces',
		);
	});

	test('accepts the same table, and a table that has new strings after the old ones', () => {
		expect(() => base.replace({})).not.toThrow();
		const offsets = base.sections[Section.StringOffsets] ?? new Uint32Array(0);
		const bytes = base.sections[Section.StringBytes] ?? new Uint32Array(0);
		const length = offsets.at(-1) ?? 0;
		const longer = new Uint32Array(offsets.length + 1);
		longer.set(offsets);
		longer[offsets.length] = length + 4;
		// the new string starts at the byte where the last one ended, which is not a word boundary
		const moreBytes = new Uint32Array(Math.ceil((length + 4) / 4));
		moreBytes.set(bytes);
		new Uint8Array(moreBytes.buffer).set(new TextEncoder().encode('abcd'), length);
		const spec = base.replace({ [Section.StringOffsets]: longer, [Section.StringBytes]: moreBytes });
		expect(spec.stringCount).toBe(base.stringCount + 1);
		expect(spec.stringAt(base.stringCount)).toBe('abcd');
	});
});

describe.each(VARIANTS)('the least size that has an index (%o)', variant => {
	const table = (count: number, names: readonly string[] = []) =>
		Array.from({ length: count }, (_, index) => ({ name: names[index] ?? `n${index}`, index }));
	const object = (count: number) =>
		Object.fromEntries(Array.from({ length: count }, (_, index) => [`k${index}`, index]));

	test.each([INDEX_MINIMUM - 1, INDEX_MINIMUM])(
		'finds the names of an array of %i and the keys of an object of %i',
		count => {
			const packed = encodeSpec({ specs: table(count), acceptedAttrNames: object(count) } as SpecLike, variant);
			const specs = packed.regions[0];
			const rest = packed.regions[4];
			if (!specs || !rest) {
				throw new Error('no region');
			}
			const indexed = count >= INDEX_MINIMUM;
			expect(specs.c(specs.root) !== 0).toBe(indexed);
			const names = packed.get(rest, rest.root, 'acceptedAttrNames');
			expect(rest.c(names) !== 0).toBe(indexed);
			for (let index = 0; index < count; index++) {
				expect(packed.position(specs, specs.root, `n${index}`)).toBe(index);
				expect(packed.entry(rest, names, `k${index}`)).toBe(index);
			}
			expect(packed.position(specs, specs.root, `n${count}`)).toBe(NONE);
			expect(packed.entry(rest, names, `k${count}`)).toBe(NONE);
		},
	);

	test('gives the first position to a name that comes twice in an indexed array', () => {
		const names = ['a', 'b', 'a', 'c', 'd', 'e', 'f', 'g', 'a'];
		const packed = encodeSpec({ specs: table(names.length, names) } as SpecLike, variant);
		const specs = packed.regions[0];
		if (!specs) {
			throw new Error('no region');
		}
		expect(specs.c(specs.root)).not.toBe(0);
		expect(packed.position(specs, specs.root, 'a')).toBe(0);
		expect(packed.position(specs, specs.root, 'g')).toBe(7);
	});

	test('holds the largest number, which is not a position that is not found', () => {
		const packed = encodeSpec({ specs: [{ name: 'x', n: 2 ** 32 - 1 }] } as SpecLike, variant);
		const specs = packed.regions[0];
		if (!specs) {
			throw new Error('no region');
		}
		const node = packed.get(specs, packed.at(specs, specs.root, 0), 'n');
		expect(node).not.toBe(NONE);
		expect(packed.toValue(specs, node)).toBe(2 ** 32 - 1);
		expect(packed.toJson().specs).toStrictEqual([{ name: 'x', n: 2 ** 32 - 1 }]);
	});
});
