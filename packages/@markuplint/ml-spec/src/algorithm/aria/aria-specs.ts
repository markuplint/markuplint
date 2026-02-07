import type { ARIAVersion, MLMLSpec } from '../../types/index.js';

/**
 * Retrieves the ARIA specification data for a given ARIA version from the markup language spec.
 *
 * @param specs - The full markup language specification containing ARIA definitions
 * @param version - The ARIA specification version to retrieve (e.g., '1.1', '1.2', '1.3')
 * @returns The ARIA specification data including roles, properties, and graphics roles for the requested version
 */
export function ariaSpecs(specs: MLMLSpec, version: ARIAVersion) {
	const aria = specs.def['#aria'];
	return aria[version];
}
