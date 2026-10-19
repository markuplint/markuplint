import type { ElementSpec } from '../types/index.js';

import { resolveNamespace } from './resolve-namespace.js';

/**
 * The results, for each list of specs it was searched in. A list is not told what another has:
 * `permitted-contents` searches the specs of the document plus the `tag` rules of its option, which
 * a lookup made in the specs of the document alone must not hide (nor the other way round). A list
 * that nothing refers to any more takes its results with it.
 */
const caches = new WeakMap<readonly unknown[], Map<string, any>>();

/**
 * Looks up an element specification by its local tag name and namespace. The tag name
 * is resolved to a namespace-qualified form (e.g., `"svg:circle"`) before searching.
 * Results are cached by the namespace-qualified name for subsequent lookups in the same
 * list of specs.
 *
 * @template K - The keys of `ElementSpec` to include in the returned spec object (defaults to all keys)
 * @param specs - The array of element specifications to search
 * @param localName - The local tag name of the element
 * @param namespace - The namespace URI string, or null for HTML namespace
 * @returns The matching element specification, or null if not found
 */
export function getSpecByTagName<K extends keyof ElementSpec = keyof ElementSpec>(
	specs: readonly Pick<ElementSpec, 'name' | K>[],
	localName: string,
	namespace: string | null,
) {
	const { localNameWithNS } = resolveNamespace(localName, namespace ?? undefined);
	let cache = caches.get(specs);
	if (!cache) {
		cache = new Map<string, any>();
		caches.set(specs, cache);
	}
	let spec: Pick<ElementSpec, 'name' | K> | null | undefined = cache.get(localNameWithNS);
	if (spec !== undefined) {
		return spec;
	}
	spec = specs.find(spec => spec.name === localNameWithNS) ?? null;
	cache.set(localNameWithNS, spec);
	return spec;
}
