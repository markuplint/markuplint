import type { MLMLSpec, Attribute } from './types';

import path from 'path';

export function getAttrSpecs(nameWithNS: string, { specs, def }: MLMLSpec) {
	const elSpec = specs.find(spec => spec.name === nameWithNS);

	if (!elSpec) {
		return null;
	}
	const globalAttrs = def['#globalAttrs'];
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
				`The type is empty in the ${attr.name} attribute of the ${nameWithNS} element (${path.resolve(
					process.cwd(),
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
