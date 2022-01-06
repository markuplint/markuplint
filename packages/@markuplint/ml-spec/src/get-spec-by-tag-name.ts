import type { MLDOMElementSpec, MLMLSpec, SpecOM } from './types';

import { getAttrSpecs } from './get-attr-specs';

const cacheMap = new WeakMap<MLMLSpec, SpecOM>();

function getSpecOM(spec: MLMLSpec): SpecOM {
	const cache = cacheMap.get(spec);
	if (cache) {
		return cache;
	}
	const som: SpecOM = {};
	for (const el of spec.specs) {
		const attributes = getAttrSpecs(el.name, spec);
		som[el.name] = {
			experimental: !!el.experimental,
			obsolete: typeof el.obsolete === 'boolean' ? !!el.obsolete : el.obsolete ? el.obsolete.alt : false,
			deprecated: !!el.deprecated,
			nonStandard: !!el.nonStandard,
			categories: el.categories,
			permittedStructures: el.permittedStructures,
			attributes: Object.values(attributes || {}),
		};
	}
	cacheMap.set(spec, som);
	return som;
}

export function getSpecByTagName(nameWithNS: string, specs: MLMLSpec): MLDOMElementSpec | null {
	const specOM = getSpecOM(specs);
	return specOM[nameWithNS] || null;
}
