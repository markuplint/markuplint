import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import { encodeSpec, type SpecLike } from './encode.ts';
import { Section, Tag, VARIANTS, variantName, type Variant } from './format.ts';
import { groupRegion } from './group.ts';

const SPEC = JSON.parse(
	readFileSync(new URL('../../../packages/@markuplint/html-spec/index.json', import.meta.url), 'utf8'),
) as SpecLike;

const GROUPED = VARIANTS.filter(variant => variant.grouped === true);

/** The candidate that is the same but for the order of the nodes. */
function twinOf(variant: Variant): Variant {
	return Object.fromEntries(Object.entries(variant).filter(([key]) => key !== 'grouped')) as unknown as Variant;
}

describe('the grouping of nodes', () => {
	test('refuses a region that is not as long as its header says', () => {
		const words = Uint32Array.from([1, 0, 0, 0, Tag.Null, 0, 0, 0, 0]);
		expect(() => groupRegion(words, false)).toThrow(/not as long as its header says/u);
	});

	test('refuses a region whose root is not one of its nodes', () => {
		const words = Uint32Array.from([1, 0, 0, 1, Tag.Null, 0, 0, 0]);
		expect(() => groupRegion(words, false)).toThrow(/not as long as its header says/u);
	});

	test('refuses a region that has no node, whose root is then none of them', () => {
		expect(() => groupRegion(Uint32Array.from([0, 0, 0, 0]), false)).toThrow(/not as long as its header says/u);
	});

	test('refuses a node whose list is not inside the lists', () => {
		const words = Uint32Array.from([1, 0, 0, 0, Tag.Array, 0, 1, 0]);
		expect(() => groupRegion(words, false)).toThrow(/not inside the lists of its region/u);
	});

	test('refuses a list that holds a node that the region lacks', () => {
		const words = Uint32Array.from([1, 1, 0, 0, Tag.Array, 0, 1, 0, 7]);
		expect(() => groupRegion(words, false)).toThrow(/holds a node that the region lacks/u);
	});

	test('refuses two nodes that share a list and do not have the same count', () => {
		// Two arrays in rows, at the same position of the lists, of one and of two items
		const words = Uint32Array.from([2, 2, 0, 0, Tag.Array, 0, 1, 0, Tag.Array, 0, 2, 0, 0, 1]);
		expect(() => groupRegion(words, false)).toThrow(/share a list with 1 and 2 items/u);
	});
});

describe.each(GROUPED)('a grouped candidate (%o)', variant => {
	const name = variantName(variant);
	const plain = encodeSpec(SPEC, twinOf(variant));
	const grouped = encodeSpec(SPEC, variant);

	test(`${name}: has the nodes in the order of their tags, and of their counts among those of a tag`, () => {
		for (const [position, region] of grouped.regions.entries()) {
			const keys = Array.from({ length: region.count }, (_, node) => [region.tag(node), region.b(node)] as const);
			const sorted = keys.toSorted((x, y) => x[0] - y[0] || x[1] - y[1]);
			expect(keys, `region ${position}`).toStrictEqual(sorted);
		}
	});

	test(`${name}: is the same data as the plain candidate, with the nodes in another order`, () => {
		expect(grouped.toJson()).toStrictEqual(SPEC);
		for (const [position, region] of grouped.regions.entries()) {
			expect(region.count, `region ${position}`).toBe(plain.regions[position]?.count);
		}
		expect(grouped.sections[Section.StringOffsets]).toStrictEqual(plain.sections[Section.StringOffsets]);
		expect(grouped.sections[Section.StringBytes]).toStrictEqual(plain.sections[Section.StringBytes]);
		expect(grouped.sections[Section.Bits]).toStrictEqual(plain.sections[Section.Bits]);
	});

	test(`${name}: has a root that is the node of the whole value`, () => {
		for (const [position, region] of grouped.regions.entries()) {
			const twin = plain.regions[position];
			expect(twin, `the plain candidate has region ${position}`).toBeDefined();
			if (twin) {
				expect(grouped.digest(region, region.root), `region ${position}`).toBe(plain.digest(twin, twin.root));
			}
		}
	});

	test(`${name}: makes the same words from the same spec`, () => {
		const again = encodeSpec(SPEC, variant);
		expect(again.serialize()).toStrictEqual(grouped.serialize());
	});
});
