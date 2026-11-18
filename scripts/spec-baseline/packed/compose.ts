/**
 * The composition of a packed spec with the extended specs of a configuration (the `ExtendedSpec` of `vue-spec`, of a
 * user's file, ...): the work that `schemaToSpec` does for every document today, done on the packed form so that
 * what an extension does not touch is shared with the base and not made again.
 *
 * What the extensions mean is `schemaToSpec` of `@markuplint/ml-spec`, and it is called here, not copied: the regions that an
 * extension touches are read from the packed spec as JSON (only those), merged by it, and encoded again with the
 * strings of the base kept at their numbers. The Rust program has to do the same in Rust (there is no `schemaToSpec` there:
 * the merge is ported in `crates/markuplint-types/examples/packed_candidates/compose.rs`), and the bytes that
 * both make for one extension are the proof that the port means the same.
 *
 * Which region an extension touches follows the branches of `schemaToSpec`:
 *
 * - `specs` when it has `specs`;
 * - `#globalAttrs` when it has `def['#globalAttrs']['#extends']`, `#aria` when it has `def['#aria']`, and `#contentModels` when it
 *   has `def['#contentModels']`;
 * - the rest (`directivePatterns`, `movedToHead`, `acceptedAttrNames`, `templateContent`, `literalValues`) when it has one of them.
 *
 * The bits are made again when `specs` or `#contentModels` is.
 *
 * @module
 */
import type { SpecLike } from './encode.ts';
import type { PackedSpec } from './read.ts';

import { schemaToSpec } from '@markuplint/ml-spec';

import { StringTable, encodeRegion } from './encode.ts';
import { REGIONS, Section } from './format.ts';
import { lazy } from './lazy.ts';

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

/** The regions that extensions touch, by their position in {@link REGIONS}. */
export function touchedRegions(extensions: readonly ExtensionLike[]): boolean[] {
	const touched = [false, false, false, false, false];
	for (const extension of extensions) {
		touched[0] ||= Boolean(extension.specs);
		touched[1] ||= Boolean(extension.def?.['#globalAttrs']?.['#extends']);
		touched[2] ||= Boolean(extension.def?.['#aria']);
		touched[3] ||= Boolean(extension.def?.['#contentModels']);
		touched[4] ||=
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
	const value = (position: number, empty: unknown) => {
		if (!touched[position]) {
			return empty;
		}
		const region = base.regions[position];
		if (!region) {
			throw new Error(`The packed spec has no region ${position}`);
		}
		return lazy(base, region, region.root);
	};
	const skeleton = {
		def: {
			'#globalAttrs': value(1, {}),
			'#aria': value(2, {}),
			'#contentModels': value(3, {}),
		},
		specs: value(0, []),
		...(value(4, {}) as Record<string, unknown>),
	};
	const merged = schemaToSpec([skeleton as never, ...(extensions as never[])]) as unknown as SpecLike;
	const { def, specs, ...rest } = merged as SpecLike & { def: Record<string, unknown> };
	const values: unknown[] = [
		specs,
		def['#globalAttrs'],
		def['#aria'],
		def['#contentModels'],
		Object.fromEntries(Object.entries(rest)),
	];

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
	return touched[0] || touched[3] ? draft.replace({ [Section.Bits]: draft.computeBits() }) : draft;
}
