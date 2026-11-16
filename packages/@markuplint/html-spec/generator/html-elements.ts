import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import { getDefinitionCite, readJsons } from './read-json.ts';
import { getName, nameCompare, sortObjectByKey } from './utils.ts';

/**
 * Namespace sort order: HTML first, then MathML, then SVG.
 */
const namespaceSortOrder: Record<string, number> = {
	'http://www.w3.org/2000/svg': 2,
	'http://www.w3.org/1998/Math/MathML': 1,
};

/**
 * Element names are derived from file names (`spec.<name>.jsonc`; `svg_` /
 * `mml_` prefixes become the `svg:` / `mml:` namespaces). A source file that
 * deviates from that pattern does not match the glob and is silently excluded
 * from the output — there is no warning for it.
 *
 * Everything is the source file's: `cite`, `contentModel`, `aria`, `globalAttrs` and the names of the attributes are
 * hand-written, and the status flags are hand-written where a specification defines them and read from BCD otherwise
 * (`applyBCD` in `bcd.ts`, which the caller runs). Nothing is fetched here. The content categories and the tag
 * omission are not written: nothing reads them, and the categories the rules use are the hand-written
 * `#contentModels`.
 */
export async function getElements(filePattern: string) {
	let specs = await readJsons<ExtendedElementSpec>(filePattern, (file, body, source) => {
		const name = file.replace(/^.+spec\.([\w-]+)\.jsonc$/i, '$1');
		return {
			// @ts-ignore
			name,
			...body,
			// The section on the first line of the source file.
			cite: getDefinitionCite(source, file),
		};
	});

	specs = specs.map(el => {
		const { localName, namespace } = getName(el.name);
		// @ts-ignore
		delete el.name;
		// @ts-ignore
		delete el.namespace;

		let qualifiedName: string;
		if (namespace === 'http://www.w3.org/2000/svg') {
			qualifiedName = `svg:${localName}`;
		} else if (namespace === 'http://www.w3.org/1998/Math/MathML') {
			qualifiedName = `mml:${localName}`;
		} else {
			qualifiedName = localName;
		}

		const spec = {
			// @ts-ignore
			name: qualifiedName,
			namespace,
			contentModel: el.contentModel,
			aria: el.aria,
			...el,
			globalAttrs: sortObjectByKey(el.globalAttrs ?? {}),
			attributes: sortObjectByKey(el.attributes ?? {}),
		};

		return spec;
	});

	return specs.toSorted(nameCompare).toSorted((a, b) => {
		const orderA = namespaceSortOrder[a.namespace ?? ''] ?? 0;
		const orderB = namespaceSortOrder[b.namespace ?? ''] ?? 0;
		return orderA - orderB;
	});
}
