import type { ARIAVersion, MLMLSpec } from '../types';
import type { ReadonlyDeep } from 'type-fest';

export function ariaSpecs(specs: ReadonlyDeep<MLMLSpec>, version: ARIAVersion) {
	const aria = specs.def['#aria'];
	return aria[version];
}
