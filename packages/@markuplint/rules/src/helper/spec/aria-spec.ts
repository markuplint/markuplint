import type { MLMLSpec } from '@markuplint/ml-spec';

export function ariaSpec(specs: Readonly<MLMLSpec>) {
	const roles = specs.def['#roles'];
	const ariaAttrs = specs.def['#ariaAttrs'];
	return {
		roles,
		ariaAttrs,
	};
}
