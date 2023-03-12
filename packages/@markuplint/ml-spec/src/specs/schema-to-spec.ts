import type { ElementSpec, ExtendedSpec, MLMLSpec, Attribute } from '../types';

import { mergeArray } from '../utils/merge-array';

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
			if (extendedSpec.def['#globalAttrs']?.['#extends']) {
				result.def['#globalAttrs']['#HTMLGlobalAttrs'] = {
					...(result.def['#globalAttrs']?.['#HTMLGlobalAttrs'] || {}),
					...(extendedSpec.def['#globalAttrs']?.['#extends'] || {}),
				};
			}
			if (extendedSpec.def['#aria']) {
				result.def['#aria'] = {
					'1.1': {
						roles: mergeArray(result.def['#aria']['1.1'].roles, extendedSpec.def['#aria']['1.1'].roles),
						props: mergeArray(result.def['#aria']['1.1'].props, extendedSpec.def['#aria']['1.1'].props),
						graphicsRoles: mergeArray(
							result.def['#aria']['1.1'].graphicsRoles,
							extendedSpec.def['#aria']['1.1'].graphicsRoles,
						),
					},
					'1.2': {
						roles: mergeArray(result.def['#aria']['1.2'].roles, extendedSpec.def['#aria']['1.2'].roles),
						props: mergeArray(result.def['#aria']['1.2'].props, extendedSpec.def['#aria']['1.2'].props),
						graphicsRoles: mergeArray(
							result.def['#aria']['1.2'].graphicsRoles,
							extendedSpec.def['#aria']['1.2'].graphicsRoles,
						),
					},
				};
			}
			if (extendedSpec.def['#contentModels']) {
				const keys = new Set([
					...Object.keys(result.def['#contentModels']),
					...Object.keys(extendedSpec.def['#contentModels']),
				]) as Set<keyof (typeof result.def)['#contentModels']>;
				for (const modelName of keys) {
					const mainModel = result.def['#contentModels'][modelName];
					const exModel = extendedSpec.def['#contentModels'][modelName];
					result.def['#contentModels'][modelName] = [...(mainModel || []), ...(exModel || [])];
				}
			}
		}
		if (extendedSpec.specs) {
			const exSpecs = extendedSpec.specs.slice();
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
	std: Record<string, Attribute>,
	ex: Record<string, Partial<Attribute>> = {},
): Record<string, Attribute> {
	const result: Record<string, Attribute> = {};
	const keys = Array.from(new Set([...Object.keys(std), ...Object.keys(ex)]));
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
