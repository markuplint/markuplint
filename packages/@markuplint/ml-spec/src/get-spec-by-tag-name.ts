import type { Attribute, MLDOMElementSpec, MLMLSpec, SpecOM } from './types';

function getSpecOM({ specs }: MLMLSpec): SpecOM {
	const som: SpecOM = {};
	for (const el of specs) {
		som[el.name] = {
			experimental: !!el.experimental,
			obsolete: typeof el.obsolete === 'boolean' ? !!el.obsolete : el.obsolete ? el.obsolete.alt : false,
			deprecated: !!el.deprecated,
			nonStandard: !!el.nonStandard,
			categories: el.categories,
			permittedStructures: el.permittedStructures,
			attributes: el.attributes.filter(
				(attr: Attribute | string): attr is Attribute => !(typeof attr === 'string'),
			),
		};
	}
	return som;
}

export function getSpecByTagName(tagName: string, specs: MLMLSpec): MLDOMElementSpec | null {
	const specOM = getSpecOM(specs);
	tagName = tagName.toLowerCase();
	return specOM[tagName] || null;
}
