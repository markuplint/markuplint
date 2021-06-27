import { ElementSpec, ExtendedSpec, MLMLSpec } from './types';
import { mergeArray } from './utils';

/**
 * Merging HTML-spec schema and extended spec schemas
 *
 * Ex: `@markuplint/html-spec` + `{ specs: ["@markuplint/vue-spec"] }` in configure files.
 *
 * @param schemas `MLDocument.schemas`
 */
export function getSpec(schemas: readonly [MLMLSpec, ...ExtendedSpec[]]) {
	const [main, ...extendedSpecs] = schemas;
	const result = { ...main };
	for (const extendedSpec of extendedSpecs) {
		if (extendedSpec.cites) {
			result.cites = [...result.cites, ...extendedSpec.cites];
		}
		if (extendedSpec.def) {
			if (extendedSpec.def['#ariaAttrs']) {
				result.def['#ariaAttrs'] = [...result.def['#ariaAttrs'], ...extendedSpec.def['#ariaAttrs']];
			}
			if (extendedSpec.def['#globalAttrs']) {
				result.def['#globalAttrs'] = [...result.def['#globalAttrs'], ...extendedSpec.def['#globalAttrs']];
			}
			if (extendedSpec.def['#roles']) {
				result.def['#roles'] = [...result.def['#roles'], ...extendedSpec.def['#roles']];
			}
			if (extendedSpec.def['#contentModels']) {
				const keys = new Set([
					...Object.keys(result.def['#contentModels']),
					...Object.keys(extendedSpec.def['#contentModels']),
				]) as Set<keyof typeof result.def['#contentModels']>;
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
					attributes: mergeArray(elSpec.attributes, exSpec.attributes),
					categories: mergeArray(elSpec.categories, exSpec.categories),
				});
			}

			result.specs = specs;
		}
	}

	return result;
}
