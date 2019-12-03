import { Attribute, MLMLSpec } from './types';
import { ContentModel, PermittedStructuresSchema } from './permitted-structres';

export * from './permitted-structres';
export * from './types';

export interface SpecOM {
	[tagName: string]: MLDOMElementSpec;
}

export interface MLDOMElementSpec {
	experimental: boolean;
	obsolete: boolean | string;
	deprecated: boolean;
	nonStandard: boolean;
	categories: ContentModel[];
	permittedStructures: PermittedStructuresSchema;
	attributes: Attribute[];
}

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

export function getSpecByTagName(tagName: string, specs: MLMLSpec): MLDOMElementSpec {
	const specOM = getSpecOM(specs);
	tagName = tagName.toLowerCase();
	const spec = specOM[tagName];
	return spec || null;
}
