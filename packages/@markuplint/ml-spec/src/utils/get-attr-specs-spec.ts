import type { MLMLSpec, Attribute } from '../types/index.js';
import type { NamespaceURI } from '@markuplint/ml-ast';

import { resolveNamespace } from './resolve-namespace.js';

const cacheMap = new Map<string, readonly Attribute[] | null>();
const schemaCache = new WeakSet<MLMLSpec>();

export function getAttrSpecs(localName: string, namespace: NamespaceURI | null, schema: MLMLSpec) {
	if (!schemaCache.has(schema)) {
		cacheMap.clear();
	}

	const { localNameWithNS } = resolveNamespace(localName, namespace ?? undefined);

	const cache = cacheMap.get(localNameWithNS);

	if (cache !== undefined) {
		return cache;
	}

	schemaCache.add(schema);

	const elSpec = schema.specs.find(spec => spec.name === localNameWithNS);
	if (!elSpec) {
		cacheMap.set(localNameWithNS, null);
		return null;
	}

	const globalAttrs = schema.def['#globalAttrs'];
	let attrs: Record<string, Partial<Attribute>> = {};

	for (const catName in elSpec.globalAttrs) {
		// @ts-ignore
		const catAttrs: boolean | string[] = elSpec.globalAttrs[catName];
		if (catAttrs === false) {
			continue;
		}
		if (typeof catAttrs === 'boolean') {
			const global = globalAttrs[catName];
			attrs = {
				...attrs,
				...global,
			};
			continue;
		}
		if (Array.isArray(catAttrs)) {
			const global = globalAttrs[catName];
			if (!global) {
				continue;
			}
			for (const selectedName of catAttrs) {
				const selected = global[selectedName];
				attrs[selectedName] = {
					...attrs[selectedName],
					...selected,
				};
			}
			continue;
		}
	}

	for (const attrName in elSpec.attributes) {
		const attr = elSpec.attributes[attrName];
		if (!attr) {
			continue;
		}

		const current = attrs[attrName];

		attrs[attrName] = {
			description: '',
			...current,
			...attr,
		};
	}

	const attrList = Object.keys(attrs).map<Attribute>(name => {
		const attr = attrs[name];
		return { name, type: 'Any', ...attr };
	});

	attrList.sort(nameCompare);

	cacheMap.set(localNameWithNS, attrList);
	return attrList;
}

type HasName = { readonly name: string };

export function nameCompare(a: HasName | string, b: HasName | string) {
	const nameA = typeof a === 'string' ? a : a.name.toUpperCase();
	const nameB = typeof b === 'string' ? b : b.name.toUpperCase();
	if (nameA < nameB) {
		return -1;
	}
	if (nameA > nameB) {
		return 1;
	}
	return 0;
}
