/**
 * The composition of a packed spec with the extended specs of a configuration (the `ExtendedSpec` of `vue-spec`, of a
 * user's file, ...): the work that `schemaToSpec` does for every document today, done on the packed form so that
 * what an extension does not touch is shared with the base and not made again.
 *
 * What the extensions mean is `schemaToSpec` of `@markuplint/ml-spec`, and it is called here, not copied. The arrays and
 * objects of the regions that an extension touches are given to it as values that read their node when they are read
 * (`lazy.ts`), so that what the merge leaves as it was comes back as the node that it is. The encoder appends what
 * it made to the region and shares the rest (the rules are in `format.ts`), and the strings of the base keep their numbers.
 * The Rust program has to do the same in Rust (there is no `schemaToSpec` there: the merge is ported in
 * `crates/markuplint-types/examples/packed_candidates/compose.rs`), and the bytes that both make for one extension are the
 * proof that the port means the same.
 *
 * Which region an extension touches follows the branches of `schemaToSpec`:
 *
 * - `specs` when it has `specs`;
 * - `#globalAttrs` when it has `def['#globalAttrs']['#extends']`, `#aria` when it has `def['#aria']`, and `#contentModels` when it
 *   has `def['#contentModels']`;
 * - the rest (`directivePatterns`, `movedToHead`, `acceptedAttrNames`, `templateContent`, `literalValues`) when it has one of them.
 *
 * The bits are computed again from the regions when `specs` or `#contentModels` is touched.
 *
 * @module
 */
import type { SpecLike } from './encode.ts';
import type { PackedSpec } from './read.ts';

import { schemaToSpec } from '@markuplint/ml-spec';

import { StringTable, assertDefKeys, encodeRegion } from './encode.ts';
import { REGIONS, RegionAt, Section } from './format.ts';
import { lazyReader } from './lazy.ts';

/** What an extension that this composes may have: the keys that `schemaToSpec` reads. */
export interface ExtensionLike {
	readonly def?: {
		readonly '#globalAttrs'?: { readonly '#extends'?: unknown } & Record<string, unknown>;
		readonly '#aria'?: unknown;
		readonly '#contentModels'?: unknown;
	};
	readonly specs?: unknown;
	readonly directivePatterns?: unknown;
	readonly movedToHead?: unknown;
	readonly acceptedAttrNames?: unknown;
	readonly templateContent?: unknown;
	readonly literalValues?: unknown;
}

/**
 * The regions that extensions touch.
 *
 * @param extensions - The extended specs
 * @returns For each region, by its position in {@link REGIONS}, whether an extension touches it
 */
export function touchedRegions(extensions: readonly ExtensionLike[]): boolean[] {
	const touched = [false, false, false, false, false];
	for (const extension of extensions) {
		touched[RegionAt.Specs] ||= Boolean(extension.specs);
		touched[RegionAt.GlobalAttrs] ||= Boolean(extension.def?.['#globalAttrs']?.['#extends']);
		touched[RegionAt.Aria] ||= Boolean(extension.def?.['#aria']);
		touched[RegionAt.ContentModels] ||= Boolean(extension.def?.['#contentModels']);
		touched[RegionAt.Rest] ||=
			Boolean(extension.directivePatterns) ||
			Boolean(extension.movedToHead) ||
			extension.acceptedAttrNames != null ||
			extension.templateContent != null ||
			Boolean(extension.literalValues);
	}
	return touched;
}

/**
 * Composes a packed spec with extended specs.
 *
 * @param base - The packed spec of `html-spec`
 * @param extensions - The extended specs, in the order that `schemaToSpec` takes them
 * @returns A spec that shares the regions that no extension touches, and the strings of the base at their numbers
 */
export function compose(base: PackedSpec, extensions: readonly ExtensionLike[]): PackedSpec {
	const touched = touchedRegions(extensions);
	if (!touched.includes(true)) {
		return base;
	}
	// What an extension touches is given to `schemaToSpec` as values that are read when it reads them (`lazy.ts`), so that
	// what it leaves as it was is still a node of the base when it comes back, and is not made again.
	const read = lazyReader(base);
	const value = (position: number, empty: unknown) => {
		if (!touched[position]) {
			return empty;
		}
		const region = base.regions[position];
		if (!region) {
			throw new Error(`The packed spec has no region ${position}`);
		}
		return read(region, region.root);
	};
	const skeleton = {
		def: {
			'#globalAttrs': value(RegionAt.GlobalAttrs, {}),
			'#aria': value(RegionAt.Aria, {}),
			'#contentModels': value(RegionAt.ContentModels, {}),
		},
		specs: value(RegionAt.Specs, []),
		...(value(RegionAt.Rest, {}) as Record<string, unknown>),
	};
	const merged = schemaToSpec([skeleton as never, ...(extensions as never[])]) as unknown as SpecLike;
	const { def, specs, ...rest } = merged as SpecLike & { def: Record<string, unknown> };
	assertDefKeys(def);
	const values: unknown[] = [specs, def['#globalAttrs'], def['#aria'], def['#contentModels'], rest];

	const strings = new StringTable(base);
	const changes: Record<number, Uint32Array> = {};
	for (const [position, id] of REGIONS.entries()) {
		if (touched[position]) {
			changes[id] = encodeRegion(values[position], strings, base.variant, base.regions[position] ?? null);
		}
	}
	if (strings.grown) {
		const { offsets, bytes } = strings.sections();
		changes[Section.StringOffsets] = offsets;
		changes[Section.StringBytes] = bytes;
	}
	const draft = base.replace(changes);
	return touched[RegionAt.Specs] || touched[RegionAt.ContentModels]
		? draft.replace({ [Section.Bits]: draft.computeBits() })
		: draft;
}
