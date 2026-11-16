import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import { getDefinitionCite, readJsons } from './read-json.ts';
import { fetchHTMLElement } from './scraping.ts';
import { getName, nameCompare, sortObjectByKey } from './utils.ts';

/**
 * Obsolete HTML elements (the ones with `obsolete: true` in their source file) that MDN has no reference page
 * for. Their page is still fetched, as a page expected to answer 404: a 404
 * is not reported as a failure on every run, and a page that MDN adds back is
 * read and reported, so that the element can be taken out of this list. While
 * the page does not exist, the element has no MDN description.
 */
export const obsoleteWithoutMDNPage: ReadonlySet<string> = new Set([
	'applet',
	'basefont',
	'bgsound',
	'blink',
	'isindex',
	'keygen',
	'listing',
	'menuitem',
	'multicol',
	'nextid',
	'spacer',
]);

/**
 * Whether MDN is known to have no reference page for an element.
 *
 * @param localName - The local name of the element
 * @param ml - The markup language of the element, as `getName` gives it
 */
export function isWithoutMDNPage(localName: string, ml: 'HTML' | 'SVG' | 'MathML') {
	return ml === 'HTML' && obsoleteWithoutMDNPage.has(localName);
}

/**
 * Returns the MDN reference page of an element.
 *
 * @param localName - The local name of the element
 * @param ml - The markup language of the element, as `getName` gives it
 */
export function getMDNElementURL(localName: string, ml: 'HTML' | 'SVG' | 'MathML') {
	const urlTagName = /^h[1-6]$/i.test(localName) ? 'Heading_Elements' : localName;
	// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a
	// https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/a
	// https://developer.mozilla.org/en-US/docs/Web/MathML/Reference/Element/math
	return `https://developer.mozilla.org/en-US/docs/Web/${ml}/Reference/Element${ml === 'HTML' ? 's' : ''}/${urlTagName}`;
}

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
 * Everything but the description is the source file's: `cite`, `contentModel`, `aria`, `globalAttrs` and the
 * names of the attributes are hand-written, and the status flags are hand-written where a specification defines
 * them and read from BCD otherwise (`applyBCD` in `bcd.ts`, which the caller runs). MDN gives the description, which
 * is dropped before the data is written (`strip-prose.ts`); its content categories and tag omission are not
 * written: nothing reads them, and the categories the rules use are the hand-written `#contentModels`.
 */
export async function getElements(filePattern: string) {
	let specs = await readJsons<ExtendedElementSpec>(filePattern, (file, body, source) => {
		const name = file.replace(/^.+spec\.([\w-]+)\.jsonc$/i, '$1');
		return {
			// @ts-ignore
			name,
			...body,
			// The section on the first line of the source file. Never the MDN page.
			cite: getDefinitionCite(source, file),
		};
	});

	specs = await Promise.all(
		specs.map(async el => {
			const { localName, namespace, ml } = getName(el.name);
			const mdnData = await fetchHTMLElement(getMDNElementURL(localName, ml), {
				expectNotFound: isWithoutMDNPage(localName, ml),
			});
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
				description: mdnData.description,
				contentModel: el.contentModel,
				aria: el.aria,
				...el,
				globalAttrs: sortObjectByKey(el.globalAttrs ?? {}),
				attributes: sortObjectByKey(el.attributes ?? {}),
			};

			return spec;
		}),
	);

	return specs.toSorted(nameCompare).toSorted((a, b) => {
		const orderA = namespaceSortOrder[a.namespace ?? ''] ?? 0;
		const orderB = namespaceSortOrder[b.namespace ?? ''] ?? 0;
		return orderA - orderB;
	});
}
