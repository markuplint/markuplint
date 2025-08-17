import type { ElementSpec } from '../types/index.js';

import { resolveNamespace } from './resolve-namespace.js';

const cache = new Map<string, any>();

export function getSpecByTagName<K extends keyof ElementSpec = keyof ElementSpec>(
	specs: readonly Pick<ElementSpec, 'name' | K>[],
	localName: string,
	namespace: string | null,
) {
	const { localNameWithNS } = resolveNamespace(localName, namespace ?? undefined);
	let spec: Pick<ElementSpec, 'name' | K> | null | undefined = cache.get(localNameWithNS);
	if (spec !== undefined) {
		return spec;
	}
	spec = specs.find(spec => spec.name === localNameWithNS) ?? null;
	cache.set(localNameWithNS, spec);
	return spec;
}
