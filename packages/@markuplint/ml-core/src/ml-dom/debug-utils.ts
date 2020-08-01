import { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

/**
 * for test suite
 */
export function dummySchemas() {
	// @ts-ignore
	return [{}, {}] as [MLMLSpec, ...ExtendedSpec[]];
}
