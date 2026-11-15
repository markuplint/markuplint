import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import { getMathMLElementList } from './mathml.ts';
import { getDefinitionCite, readJsons } from './read-json.ts';
import { fetchHTMLElement, fetchObsoleteElements, fetchObsoleteTerms } from './scraping.ts';
import { getSVGElementList } from './svg.ts';
import { STATUS_FLAGS, getName, nameCompare, sortObjectByKey } from './utils.ts';

/**
 * List of non-conforming (obsolete) HTML elements.
 *
 * @see https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features
 */
export const obsoleteList: readonly string[] = [
	'applet',
	'acronym',
	'bgsound',
	'dir',
	'frame',
	'frameset',
	'noframes',
	'isindex',
	'keygen',
	'listing',
	'menuitem',
	'nextid',
	'noembed',
	'param',
	'plaintext',
	'rb',
	'rtc',
	'strike',
	'xmp',
	'basefont',
	'big',
	'blink',
	'center',
	'font',
	'marquee',
	'multicol',
	'nobr',
	'spacer',
	'tt',
];

/**
 * Obsolete HTML elements in `obsoleteList` that MDN has no reference page
 * for. Their page is still fetched, as a page expected to answer 404: a 404
 * is not reported as a failure on every run, and a page that MDN adds back is
 * read and reported, so that the element can be taken out of this list. While
 * the page does not exist, the element has no MDN description or
 * attributes, only what `fetchObsoleteElements` gives every obsolete element.
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
 * Merge precedence: manual spec data always wins over MDN-scraped data.
 * `cite`, `contentModel`, `aria`, and `globalAttrs` are never scraped (manual
 * only); MDN only fills gaps — descriptions, status flags, and attributes that
 * the manual spec does not define and that carry a status flag (a bare name
 * from MDN is not added: see `mergeMDNAttributes`). Its content categories and
 * tag omission are not written: nothing reads them, and the categories the
 * rules use are the hand-written `#contentModels`.
 */
export async function getElements(filePattern: string) {
	let specs = await readJsons<ExtendedElementSpec>(filePattern, (file, body, source) => {
		const name = file.replace(/^.+spec\.([\w-]+)\.jsonc$/i, '$1');
		return {
			// @ts-ignore
			name,
			...body,
			// The section of the source file; an obsolete element without one gets the list of
			// non-conforming features from `fetchObsoleteElements`. Never the MDN page.
			cite: getDefinitionCite(source, file),
		};
	});

	const [svgDeprecatedList, mathmlDeprecatedList, hasObsoleteTerm] = await Promise.all([
		getSVGElementList(),
		getMathMLElementList(),
		fetchObsoleteTerms(),
	]);

	const obsoleteElements = fetchObsoleteElements(
		[...obsoleteList, ...svgDeprecatedList, ...mathmlDeprecatedList],
		specs,
		hasObsoleteTerm,
	);
	specs.push(...obsoleteElements);

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
				attributes: sortObjectByKey(mergeMDNAttributes(el.attributes, mdnData.attributes)),
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

/**
 * Merges the attributes scraped from MDN into the manual ones of an element.
 * A manual entry wins over the MDN fields it also has. A status flag is written as
 * `true` or not at all, which is what the schema of the sources accepts (`nonStandard`
 * is `const: true`), whatever the flag of the MDN side holds. The names of the
 * attributes come from the manual spec, which cites the specification that
 * defines each one; an attribute only MDN has is added only when it carries a
 * status flag, and then takes its description and flags. Nothing is added for
 * a bare name: it would make the attribute known without a specification
 * behind it.
 *
 * @param manual - The attributes of the manual spec (`src/spec.*.jsonc`)
 * @param mdn - The attributes scraped from the element's MDN page
 */
export function mergeMDNAttributes(manual: ExtendedElementSpec['attributes'], mdn: ExtendedElementSpec['attributes']) {
	const attrs = { ...manual };

	for (const mdnAttr of Object.values(mdn ?? {})) {
		if (!mdnAttr.name) {
			continue;
		}

		const current = attrs[mdnAttr.name];

		if (!current) {
			if (!STATUS_FLAGS.some(flag => mdnAttr[flag])) {
				continue;
			}
			attrs[mdnAttr.name] = {
				description: mdnAttr.description,
				experimental: mdnAttr.experimental || undefined,
				obsolete: mdnAttr.obsolete || undefined,
				deprecated: mdnAttr.deprecated || undefined,
				nonStandard: mdnAttr.nonStandard || undefined,
			};
			continue;
		}

		attrs[mdnAttr.name] = {
			// A manual entry that has "name" keeps it as its first key
			...('name' in current ? { name: mdnAttr.name } : {}),
			description: mdnAttr.description,
			experimental: mdnAttr.experimental || undefined,
			obsolete: mdnAttr.obsolete || undefined,
			deprecated: mdnAttr.deprecated || undefined,
			nonStandard: mdnAttr.nonStandard || undefined,
			...current,
		};
	}

	return attrs;
}
