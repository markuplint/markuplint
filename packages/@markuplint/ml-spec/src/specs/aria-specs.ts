import type { MLMLSpec } from '../types';

export function ariaSpecs(specs: Readonly<MLMLSpec>) {
	const roles = specs.def['#roles'];
	const ariaAttrs = specs.def['#ariaAttrs'];
	return {
		roles,
		ariaAttrs,
	};
}
