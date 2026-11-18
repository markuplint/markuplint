import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { describe, expect, test } from 'vitest';

import { schemaToSpec } from '@markuplint/ml-spec';
import vue from '@markuplint/vue-spec';

import { compose, touchedRegions, type ExtensionLike } from './compose.ts';
import { EXTENSIONS as EXTENSION_BY_NAME, USER } from './extensions.ts';
import { encodeSpec, regionValues, type SpecLike } from './encode.ts';
import { NONE, Section, VARIANTS, variantName } from './format.ts';
import { bitsOf } from './questions.ts';
import { PackedSpec } from './read.ts';

const SPEC = JSON.parse(
	readFileSync(new URL('../../../packages/@markuplint/html-spec/index.json', import.meta.url), 'utf8'),
) as SpecLike;

/** The JSON that an engine of the other language would be given: what `JSON.stringify` keeps of the merged spec. */
// eslint-disable-next-line unicorn/prefer-structured-clone -- the text is what is handed over, and it drops an `undefined`
const asJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const EXTENSIONS: readonly (readonly [string, readonly ExtensionLike[]])[] = [
	...Object.entries(EXTENSION_BY_NAME).map(([name, extension]) => [name, [extension]] as const),
	['two extensions', [vue as ExtensionLike, USER]],
	['an extension that is empty', [{}]],
	['no extension', []],
];

describe('touchedRegions', () => {
	test('follows the branches of schemaToSpec', () => {
		expect(touchedRegions([])).toStrictEqual([false, false, false, false, false]);
		// `if (extendedSpec.specs)`: an empty array is truthy
		expect(touchedRegions([{ specs: [] }])).toStrictEqual([true, false, false, false, false]);
		expect(touchedRegions([{ specs: undefined }])).toStrictEqual([false, false, false, false, false]);
		expect(touchedRegions([{ def: { '#globalAttrs': { '#extends': {} } } }])).toStrictEqual([
			false,
			true,
			false,
			false,
			false,
		]);
		expect(touchedRegions([{ def: { '#globalAttrs': {} } }])).toStrictEqual([false, false, false, false, false]);
		expect(touchedRegions([{ def: { '#aria': {} } }])).toStrictEqual([false, false, true, false, false]);
		expect(touchedRegions([{ def: { '#contentModels': {} } }])).toStrictEqual([false, false, false, true, false]);
		expect(touchedRegions([{ movedToHead: ['a'] }])).toStrictEqual([false, false, false, false, true]);
		expect(touchedRegions([{ templateContent: false }])).toStrictEqual([false, false, false, false, true]);
		expect(touchedRegions([{ acceptedAttrNames: false } as never])).toStrictEqual([
			false,
			false,
			false,
			false,
			true,
		]);
	});

	test('gives the regions of the framework specs that they touch', () => {
		// Vue and the others add global attributes and elements, and the markup languages change `templateContent`
		expect(touchedRegions([vue as ExtensionLike])[0]).toBe(true);
		expect(touchedRegions([vue as ExtensionLike])[1]).toBe(true);
	});
});

describe('touchedRegions, against what schemaToSpec does', () => {
	test.each(EXTENSIONS)('lists every region that the merge changes, for %s', (_name, extensions) => {
		const merged = asJson(schemaToSpec([SPEC as never, ...(extensions as never[])])) as SpecLike;
		const before = regionValues(SPEC);
		const after = regionValues(merged);
		const touched = touchedRegions(extensions);
		const changed = before.map((value, position) => !isDeepStrictEqual(asJson(value), asJson(after[position])));
		// a region that the merge changes and that is not listed would be shared with the base, and the change lost
		expect(changed.map((isChanged, position) => isChanged && !touched[position])).toStrictEqual([
			false,
			false,
			false,
			false,
			false,
		]);
	});
});

describe.each(VARIANTS)('compose (%o)', variant => {
	const base = encodeSpec(SPEC, variant);

	test.each(EXTENSIONS)(
		`${variantName(variant)}: gives the JSON that schemaToSpec gives for %s`,
		(_name, extensions) => {
			const composed = compose(base, extensions);
			const expected = asJson(schemaToSpec([SPEC as never, ...(extensions as never[])]));
			expect(composed.toJson()).toStrictEqual(expected);
		},
	);

	test('shares the sections that no extension touches, and the whole spec when none does', () => {
		const composed = compose(base, [{ def: { '#contentModels': { '#flow': ['my-element'] } } }]);
		for (const id of [Section.Specs, Section.GlobalAttrs, Section.Aria, Section.Rest]) {
			expect(composed.sections[id]).toBe(base.sections[id]);
		}
		expect(composed.sections[Section.ContentModels]).not.toBe(base.sections[Section.ContentModels]);
		expect(compose(base, [])).toBe(base);
		expect(compose(base, [{}])).toBe(base);
	});

	test('appends what an extension changes to the region, and every node, list and index of the base stays as it was', () => {
		for (const extensions of [[vue as ExtensionLike], [USER]]) {
			const composed = compose(base, extensions);
			for (const [position, region] of base.regions.entries()) {
				const after = composed.regions[position];
				if (!after || after === region) {
					continue;
				}
				expect(after.count).toBeGreaterThanOrEqual(region.count);
				for (let node = 0; node < region.count; node++) {
					expect([after.tag(node), after.a(node), after.b(node), after.c(node)]).toStrictEqual([
						region.tag(node),
						region.a(node),
						region.b(node),
						region.c(node),
					]);
				}
				expect([...after.lists.subarray(0, region.lists.length)]).toStrictEqual([...region.lists]);
				expect([...after.indexes.subarray(0, region.indexes.length)]).toStrictEqual([...region.indexes]);
			}
		}
	});

	test('makes new nodes only for what the extension changes', () => {
		const composed = compose(base, [vue as ExtensionLike]);
		const specs = base.regions[0];
		const after = composed.regions[0];
		if (!specs || !after) {
			throw new Error('no region');
		}
		// vue-spec changes a few of the elements, and none of the roles
		expect(after.count - specs.count).toBeLessThan(specs.count / 20);
		expect(composed.sections[Section.Aria]).toBe(base.sections[Section.Aria]);
	});

	test('uses the index of the base for a table that has the same names', () => {
		const composed = compose(base, [vue as ExtensionLike]);
		const specs = base.regions[0];
		const after = composed.regions[0];
		if (!specs || !after) {
			throw new Error('no region');
		}
		expect(after.c(after.root)).toBe(specs.c(specs.root));
		expect(after.root).not.toBe(specs.root);
	});

	test('does not change the base', () => {
		const before = base.serialize();
		compose(base, [vue as ExtensionLike, USER]);
		const after = base.serialize();
		expect(after.every((word, index) => word === before[index])).toBe(true);
		expect(after.length).toBe(before.length);
	});

	test('keeps the numbers of the strings of the base, and adds the new ones after them', () => {
		const composed = compose(base, [USER]);
		expect(composed.stringCount).toBeGreaterThan(base.stringCount);
		for (let sid = 0; sid < base.stringCount; sid++) {
			expect(composed.stringAt(sid)).toBe(base.stringAt(sid));
		}
		expect(composed.stringAt(composed.stringCount - 1)).not.toBe('');
	});

	test.each(Object.entries(EXTENSION_BY_NAME))(
		'gives bits that answer as the composed data does, for %s',
		(_name, extension) => {
			const composed = compose(base, [extension]);
			const { elements, categories } = bitsOf(composed.toJson() as SpecLike);
			expect(composed.elementCount).toBe(elements.length);
			const differences = elements.flatMap((element, position) => [
				...element.flags.flatMap((has, flag) =>
					composed.flag(position, flag) === (has ? 1 : 0) ? [] : [{ position, flag }],
				),
				...categories.flatMap((category, row) =>
					composed.member(position, row) === (category.members.has(element.name) ? 1 : 0)
						? []
						: [{ position, row }],
				),
			]);
			expect(differences).toStrictEqual([]);
		},
	);

	test('does not let a composition see what another composition of the same base made', () => {
		compose(base, [USER]);
		const only = compose(base, [vue as ExtensionLike]);
		expect(only.toJson()).toStrictEqual(asJson(schemaToSpec([SPEC as never, vue as never])));
		const global = only.regions[1];
		if (!global) {
			throw new Error('no region');
		}
		const html = only.get(global, global.root, '#HTMLGlobalAttrs');
		expect(only.get(global, html, 'x-user-attr')).toBe(NONE);
		const added = Object.keys(
			(vue as { def: { '#globalAttrs': { '#extends': object } } }).def['#globalAttrs']['#extends'],
		);
		expect(added.length).toBeGreaterThan(0);
		for (const name of added) {
			expect(only.get(global, html, name), name).not.toBe(NONE);
		}
	});

	test('refuses an extension of the ARIA for a base that has none to merge it into, as schemaToSpec does', () => {
		const empty = encodeSpec({ specs: [] }, variant);
		expect(() => compose(empty, [USER])).toThrow(/Cannot read properties of undefined/u);
		expect(() => schemaToSpec([{ def: {}, specs: [] } as never, USER as never])).toThrow(
			/Cannot read properties of undefined/u,
		);
	});

	test('can be composed again, and opened as a file', () => {
		const once = compose(base, [vue as ExtensionLike]);
		const twice = compose(once, [USER]);
		expect(twice.toJson()).toStrictEqual(asJson(schemaToSpec([SPEC as never, vue as never, USER as never])));
		const opened = PackedSpec.open(twice.serialize());
		expect(opened.toJson()).toStrictEqual(twice.toJson());
	});

	test('finds what an extension added, by name', () => {
		const composed = compose(base, [USER]);
		const global = composed.regions[1];
		if (!global) {
			throw new Error('no region');
		}
		const html = composed.get(global, global.root, '#HTMLGlobalAttrs');
		expect(composed.get(global, html, 'x-user-attr')).not.toBe(NONE);
		expect(base.get(base.regions[1] as never, base.regions[1]?.root ?? 0, '#HTMLGlobalAttrs')).not.toBe(NONE);
	});
});
