import type { ARIAVersion, MLMLSpec } from '../types';

export function ariaSpecs(specs: Readonly<MLMLSpec>, version: ARIAVersion) {
	const aria = specs.def['#aria'];
	return aria[version];
}
