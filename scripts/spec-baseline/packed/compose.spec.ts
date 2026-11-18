import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import alpine from '@markuplint/alpine-spec';
import htmx from '@markuplint/htmx-spec';
import { schemaToSpec } from '@markuplint/ml-spec';
import react from '@markuplint/react-spec';
import svelte from '@markuplint/svelte-spec';
import vue from '@markuplint/vue-spec';

import { compose, touchedRegions, type ExtensionLike } from './compose.ts';
import { USER } from './extensions.ts';
import { encodeSpec, type SpecLike } from './encode.ts';
import { NONE, Section, VARIANTS, variantName } from './format.ts';
import { PackedSpec } from './read.ts';

const SPEC = JSON.parse(
	readFileSync(new URL('../../../packages/@markuplint/html-spec/index.json', import.meta.url), 'utf8'),
) as SpecLike;

/** The JSON that an engine of the other language would be given: what `JSON.stringify` keeps of the merged spec. */
// eslint-disable-next-line unicorn/prefer-structured-clone -- the text is what is handed over, and it drops an `undefined`
const asJson = (value: unknown): unknown => JSON.parse(JSON.stringify(value));

const EXTENSIONS: readonly (readonly [string, readonly ExtensionLike[]])[] = [
	['vue-spec', [vue as ExtensionLike]],
	['react-spec', [react as ExtensionLike]],
	['svelte-spec', [svelte as ExtensionLike]],
	['alpine-spec', [alpine as ExtensionLike]],
	['htmx-spec', [htmx as ExtensionLike]],
	['an extension of a user', [USER]],
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

	test('gives bits that answer for the composed spec', () => {
		const composed = compose(base, [USER]);
		const specs = composed.regions[0];
		const content = composed.regions[3];
		if (!specs || !content) {
			throw new Error('no region');
		}
		const div = SPEC.specs ? (SPEC.specs as { name: string }[]).findIndex(element => element.name === 'div') : -1;
		const flowEntry = [
			...Object.keys((SPEC.def as Record<string, Record<string, unknown>>)['#contentModels'] ?? {}),
			'#my-category',
		].indexOf('#my-category');
		expect(composed.member(div, flowEntry)).toBe(1);
		expect(base.elementCount).toBe(composed.elementCount);
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
