import { ElementCategories, MLMLSpec } from './types';
export * from './types';

export interface SpecOM {
	[tagName: string]: MLDOMElementSpec;
}

export interface MLDOMElementSpec {
	experimental: boolean;
	obsolete: boolean | string;
	deprecated: boolean;
	nonStandard: boolean;
	categories: ElementCategories;
}

export function getSpecOM({ specs }: MLMLSpec): SpecOM {
	const som: SpecOM = {};
	for (const el of specs) {
		som[el.name] = {
			experimental: !!el.experimental,
			obsolete: typeof el.obsolete === 'boolean' ? !!el.obsolete : el.obsolete ? el.obsolete.alt : false,
			deprecated: !!el.deprecated,
			nonStandard: !!el.nonStandard,
			categories: el.categories,
		};
	}
	return som;
}

export function getSpecByTagName(tagName: string, specOM: SpecOM): MLDOMElementSpec {
	tagName = tagName.toLowerCase();
	const spec = specOM[tagName];
	return spec || null;
}
