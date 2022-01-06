import type { MLMLSpec, Attribute } from './types';

const cacheMap = new Map<string, Attribute[] | null>();
const schemaCache = new WeakSet<MLMLSpec>();

export function getAttrSpecs(nameWithNS: string, schema: MLMLSpec) {
	if (!schemaCache.has(schema)) {
		cacheMap.clear();
	}

	const cache = cacheMap.get(nameWithNS);

	if (cache !== undefined) {
		return cache;
	}

	schemaCache.add(schema);

	const elSpec = schema.specs.find(spec => spec.name === nameWithNS);
	if (!elSpec) {
		cacheMap.set(nameWithNS, null);
		return null;
	}

	const globalAttrs = schema.def['#globalAttrs'];
	let attrs: Record<string, Partial<Attribute>> = {};

	for (const catName in elSpec.globalAttrs) {
		// @ts-ignore
		const catAttrs: boolean | string[] = elSpec.globalAttrs[catName];
		if (!catAttrs) {
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
			catAttrs.forEach(selectedName => {
				const selected = global[selectedName];
				attrs[selectedName] = {
					...attrs[selectedName],
					...selected,
				};
			});
			continue;
		}
	}

	for (const attrName in elSpec.attributes) {
		const attr = elSpec.attributes[attrName];
		if (!attr) {
			continue;
		}

		const current = attrs[attrName] as Omit<Attribute, 'name'> | undefined;

		attrs[attrName] = {
			description: '',
			...current,
			...attr,
		};
	}

	const attrList: Attribute[] = Object.keys(attrs).map<Attribute>(name => {
		const attr = attrs[name];
		return { name, type: 'Any', ...attr };
	});

	for (const attr of attrList) {
		if (!attr.type) {
			throw new Error(
				`The type is empty in the ${attr.name} attribute of the ${nameWithNS} element,
					'packages',
					'@markuplint',
					'html-spec',
					'src',
					'attributes',
					nameWithNS.replace(':', '_') + '.json',
				)})`,
			);
		}
	}

	attrList.sort(nameCompare);

	cacheMap.set(nameWithNS, attrList);
	return attrList;
}

type HasName = { name: string };

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
