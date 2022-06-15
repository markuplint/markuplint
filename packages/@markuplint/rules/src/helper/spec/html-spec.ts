import type { ElementSpec, MLMLSpec } from '@markuplint/ml-spec';

const cache = new Map<string, ElementSpec | null>();

export function htmlSpec(specs: Readonly<MLMLSpec>, nameWithNS: string) {
	let spec = cache.get(nameWithNS);
	if (spec !== undefined) {
		return spec;
	}
	spec = specs.specs.find(spec => spec.name === nameWithNS) || null;
	cache.set(nameWithNS, spec);
	return spec;
}
