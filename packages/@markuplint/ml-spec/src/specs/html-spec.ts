import type { ElementSpec, MLMLSpec } from '../types';

import { resolveNamespace } from '../utils/resolve-namespace';

const cache = new Map<string, ElementSpec | null>();

export function htmlSpec(specs: Readonly<MLMLSpec>, localName: string, namespace: string | null) {
	const { localNameWithNS } = resolveNamespace(localName, namespace || undefined);
	let spec = cache.get(localNameWithNS);
	if (spec !== undefined) {
		return spec;
	}
	spec = specs.specs.find(spec => spec.name === localNameWithNS) || null;
	cache.set(localNameWithNS, spec);
	return spec;
}
