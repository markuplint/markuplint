import type { ElementSpec, ExtendedSpec, MLMLSpec, Attribute } from '../types/index.js';

import { mergeArray } from './merge-array.js';

/**
 * Merges an HTML-spec schema with zero or more extended spec schemas into a single
 * unified specification. Extended specs can add or override global attributes,
 * ARIA definitions, content models, and element specifications.
 *
 * Ex: `@markuplint/html-spec` + `{ specs: { "\\.vue$": "@markuplint/vue-spec" } }` in configure files.
 *
 * The merge is an additive overlay with silent, unconditional override: later
 * specs win, and there is deliberately no conflict detection and no provenance
 * tracking in the merged result. Framework specs exist precisely to relax or
 * extend base HTML constraints (e.g. React's `dangerouslySetInnerHTML`, Vue's
 * `v-if`), so every key collision with the base spec is treated as a
 * deliberate decision by the `ExtendedSpec` author — an extension that
 * unintentionally weakens a base constraint is not flagged anywhere.
 *
 * @see https://github.com/markuplint/markuplint/issues/3893
 *
 * @param schemas - A tuple where the first element is the base `MLMLSpec` and subsequent elements are extended specs to merge
 * @returns The merged specification combining the base spec with all extensions
 */
export function schemaToSpec(schemas: readonly [MLMLSpec, ...ExtendedSpec[]]) {
	const [main, ...extendedSpecs] = schemas;
	const result = { ...main };
	for (const extendedSpec of extendedSpecs) {
		if (extendedSpec.cites) {
			result.cites = [...result.cites, ...extendedSpec.cites];
		}
		if (extendedSpec.def) {
			const def = { ...result.def };
			if (extendedSpec.def['#globalAttrs']?.['#extends']) {
				const gAttrs = {
					...def['#globalAttrs'],
					'#HTMLGlobalAttrs': {
						...def['#globalAttrs']?.['#HTMLGlobalAttrs'],
						...extendedSpec.def['#globalAttrs']?.['#extends'],
					},
				};
				def['#globalAttrs'] = gAttrs;
			}
			if (extendedSpec.def['#aria']) {
				def['#aria'] = {
					'1.1': {
						roles: mergeArray(def['#aria']['1.1'].roles, extendedSpec.def['#aria']['1.1'].roles),
						props: mergeArray(def['#aria']['1.1'].props, extendedSpec.def['#aria']['1.1'].props),
						graphicsRoles: mergeArray(
							def['#aria']['1.1'].graphicsRoles,
							extendedSpec.def['#aria']['1.1'].graphicsRoles,
						),
						dpubRoles: mergeArray(
							def['#aria']['1.1'].dpubRoles,
							extendedSpec.def['#aria']['1.1'].dpubRoles,
						),
					},
					'1.2': {
						roles: mergeArray(def['#aria']['1.2'].roles, extendedSpec.def['#aria']['1.2'].roles),
						props: mergeArray(def['#aria']['1.2'].props, extendedSpec.def['#aria']['1.2'].props),
						graphicsRoles: mergeArray(
							def['#aria']['1.2'].graphicsRoles,
							extendedSpec.def['#aria']['1.2'].graphicsRoles,
						),
						dpubRoles: mergeArray(
							def['#aria']['1.2'].dpubRoles,
							extendedSpec.def['#aria']['1.2'].dpubRoles,
						),
					},
					'1.3': {
						roles: mergeArray(def['#aria']['1.3'].roles, extendedSpec.def['#aria']['1.3'].roles),
						props: mergeArray(def['#aria']['1.3'].props, extendedSpec.def['#aria']['1.3'].props),
						graphicsRoles: mergeArray(
							def['#aria']['1.3'].graphicsRoles,
							extendedSpec.def['#aria']['1.3'].graphicsRoles,
						),
						dpubRoles: mergeArray(
							def['#aria']['1.3'].dpubRoles,
							extendedSpec.def['#aria']['1.3'].dpubRoles,
						),
					},
				};
			}
			if (extendedSpec.def['#contentModels']) {
				const models = { ...def['#contentModels'] };
				const keys = new Set([
					...Object.keys(def['#contentModels']),
					...Object.keys(extendedSpec.def['#contentModels']),
				]) as Set<keyof (typeof def)['#contentModels']>;
				for (const modelName of keys) {
					const mainModel = def['#contentModels'][modelName];
					const exModel = extendedSpec.def['#contentModels'][modelName];
					models[modelName] = [...(mainModel ?? []), ...(exModel ?? [])];
				}
				def['#contentModels'] = models;
			}
			result.def = def;
		}
		if (extendedSpec.directivePatterns) {
			result.directivePatterns = [...(result.directivePatterns ?? []), ...extendedSpec.directivePatterns];
		}
		if (extendedSpec.acceptedAttrNames != null) {
			result.acceptedAttrNames = extendedSpec.acceptedAttrNames;
		}
		if (extendedSpec.specs) {
			const exSpecs = [...extendedSpec.specs];
			const specs: ElementSpec[] = [];
			for (const elSpec of result.specs) {
				const tagName = elSpec.name.toLowerCase();
				const index = exSpecs.findIndex(spec => spec.name.toLowerCase() === tagName);
				if (index === -1) {
					specs.push(elSpec);
					continue;
				}
				const exSpec = exSpecs.splice(index, 1)[0];
				specs.push({
					...elSpec,
					...exSpec,
					globalAttrs: {
						...elSpec.globalAttrs,
						...exSpec?.globalAttrs,
					},
					attributes: mergeAttrSpec(elSpec.attributes, exSpec?.attributes),
					categories: mergeArray(elSpec.categories, exSpec?.categories),
				});
			}

			result.specs = specs;
		}
	}

	return result;
}

function mergeAttrSpec(
	std: Readonly<Record<string, Attribute>>,
	ex: Readonly<Record<string, Partial<Attribute>>> = {},
): Record<string, Readonly<Attribute>> {
	const result: Record<string, Attribute> = {};
	const keys = [...new Set([...Object.keys(std), ...Object.keys(ex)])];
	for (const key of keys) {
		const _std = std[key]!;
		const _ex = ex[key];
		result[key] = {
			..._std,
			..._ex,
		};
	}
	return result;
}
