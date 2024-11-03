import type { ElementSpec, ExtendedSpec, MLMLSpec, Attribute } from '../types/index.js';

import { mergeArray } from '../utils/merge-array.js';

/**
 * Merging HTML-spec schema and extended spec schemas
 *
 * Ex: `@markuplint/html-spec` + `{ specs: { "\\.vue$": "@markuplint/vue-spec" } }` in configure files.
 *
 * @param schemas `MLDocument.schemas`
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
				const gAttrs = { ...def['#globalAttrs'] };
				gAttrs['#HTMLGlobalAttrs'] = {
					...def['#globalAttrs']?.['#HTMLGlobalAttrs'],
					...extendedSpec.def['#globalAttrs']?.['#extends'],
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
					},
					'1.2': {
						roles: mergeArray(def['#aria']['1.2'].roles, extendedSpec.def['#aria']['1.2'].roles),
						props: mergeArray(def['#aria']['1.2'].props, extendedSpec.def['#aria']['1.2'].props),
						graphicsRoles: mergeArray(
							def['#aria']['1.2'].graphicsRoles,
							extendedSpec.def['#aria']['1.2'].graphicsRoles,
						),
					},
					'1.3': {
						roles: mergeArray(def['#aria']['1.3'].roles, extendedSpec.def['#aria']['1.3'].roles),
						props: mergeArray(def['#aria']['1.3'].props, extendedSpec.def['#aria']['1.3'].props),
						graphicsRoles: mergeArray(
							def['#aria']['1.3'].graphicsRoles,
							extendedSpec.def['#aria']['1.3'].graphicsRoles,
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
				const removedSpecs = exSpecs.splice(index, 1);
				const exSpec = removedSpecs[0];
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
