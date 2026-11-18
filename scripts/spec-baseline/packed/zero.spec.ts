import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { encodeSpec, type SpecLike } from './encode.ts';
import { BARE_FLAG, NONE, VARIANTS, variantName } from './format.ts';

const SPEC = JSON.parse(
	readFileSync(new URL('../../../packages/@markuplint/html-spec/index.json', import.meta.url), 'utf8'),
) as SpecLike;

const ZERO = VARIANTS.filter(variant => variant.zero === true);

/**
 * The slots of the perfect-hash indexes of a region: each record is `[entries, n, seed, buckets, slots, pilots...,
 * slots..., keys...]`, and when the top bit of `n` is set the last word is the position of a list in place of the keys.
 */
function slotsOf(indexes: Uint32Array): { entries: number; distinct: number; slots: number[] }[] {
	const found: { entries: number; distinct: number; slots: number[] }[] = [];
	let at = 0;
	while (at < indexes.length) {
		const entries = indexes[at] ?? 0;
		const marked = indexes[at + 1] ?? 0;
		const distinct = marked & ~BARE_FLAG;
		const buckets = indexes[at + 3] ?? 0;
		const slots = indexes[at + 4] ?? 0;
		const slotsAt = at + 5 + Math.ceil(buckets / 2);
		found.push({ entries, distinct, slots: [...indexes.subarray(slotsAt, slotsAt + slots)] });
		at = slotsAt + slots + ((marked & BARE_FLAG) === 0 ? entries : 1);
	}
	return found;
}

test('an empty slot is a slot of a perfect hash, and a sorted index is refused for it by the encoder, which the header would refuse', () => {
	expect(() => encodeSpec(SPEC, { columns: false, index: 'sorted', hash: 'murmur3', zero: true })).toThrow(
		/slot of a perfect hash/u,
	);
});

test('a spec that has no index of any size is refused as well, for a sorted index with the empty slot 0', () => {
	expect(() => encodeSpec({ specs: [] }, { columns: false, index: 'sorted', hash: 'murmur3', zero: true })).toThrow(
		/slot of a perfect hash/u,
	);
});

describe.each(ZERO)('a candidate whose empty slot is 0 (%o)', variant => {
	const name = variantName(variant);
	const packed = encodeSpec(SPEC, variant);

	test(`${name}: holds no slot that is the marker of none, and a position plus one in the others`, () => {
		for (const [position, region] of packed.regions.entries()) {
			for (const index of slotsOf(region.indexes)) {
				expect(index.slots.includes(NONE), `region ${position}`).toBe(false);
				// A position is below the entries, which are more than the different keys when a name comes twice
				expect(
					index.slots.every(slot => slot <= index.entries),
					`region ${position}`,
				).toBe(true);
				expect(index.slots.filter(slot => slot !== 0)).toHaveLength(index.distinct);
			}
		}
	});

	test(`${name}: finds every element, and no name that is not one`, () => {
		const specs = packed.regions[0];
		if (!specs) {
			throw new Error('no region');
		}
		const names = (SPEC.specs as { name: string }[]).map(element => element.name);
		for (const [position, element] of names.entries()) {
			expect(packed.position(specs, specs.root, element)).toBe(position);
		}
		for (const missing of ['', 'nope', 'svg:', 'DIV', 'div ']) {
			expect(packed.find(specs, specs.root, missing)).toBe(NONE);
		}
	});
});
