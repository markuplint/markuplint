import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import { getMathMLElementList } from './mathml.ts';
import { readJsons } from './read-json.ts';
import { fetchHTMLElement, fetchObsoleteElements } from './scraping.ts';
import { getSVGElementList } from './svg.ts';
import { getName, nameCompare, sortObjectByKey } from './utils.ts';

/**
 * List of non-conforming (obsolete) HTML elements.
 *
 * @see https://html.spec.whatwg.org/multipage/obsolete.html#non-conforming-features
 */
const obsoleteList = [
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
 * Namespace sort order: HTML first, then MathML, then SVG.
 */
const namespaceSortOrder: Record<string, number> = {
	'http://www.w3.org/2000/svg': 2,
	'http://www.w3.org/1998/Math/MathML': 1,
};

/**
 * Builds the complete list of HTML, SVG, and MathML element specifications by reading local JSON spec files,
 * enriching them with data scraped from MDN, and appending obsolete/deprecated elements.
 * Elements are sorted alphabetically with MathML elements after HTML and SVG elements after MathML.
 *
 * @param filePattern - An absolute glob pattern matching the per-element JSON spec files
 * @returns A sorted array of extended element specification objects
 */
export async function getElements(filePattern: string) {
	let specs = await readJsons<ExtendedElementSpec>(filePattern, (file, body) => {
		const name = file.replace(/^.+spec\.([\w-]+)\.jsonc$/i, '$1');
		return {
			// @ts-ignore
			name,
			...body,
		};
	});

	const [svgDeprecatedList, mathmlDeprecatedList] = await Promise.all([getSVGElementList(), getMathMLElementList()]);

	const obsoleteElements = fetchObsoleteElements(
		[...obsoleteList, ...svgDeprecatedList, ...mathmlDeprecatedList],
		specs,
	);
	specs.push(...obsoleteElements);

	specs = await Promise.all(
		specs.map(async el => {
			const { localName, namespace, ml } = getName(el.name);
			const urlTagName = /^h[1-6]$/i.test(localName) ? 'Heading_Elements' : localName;
			// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a
			// https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/a
			// https://developer.mozilla.org/en-US/docs/Web/MathML/Reference/Element/math
			const cite = `https://developer.mozilla.org/en-US/docs/Web/${ml}/Reference/Element${ml === 'HTML' ? 's' : ''}/${urlTagName}`;
			const mdnData = await fetchHTMLElement(cite);
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
				cite: el.cite ?? mdnData.cite,
				description: mdnData.description,
				categories: mdnData.categories,
				contentModel: el.contentModel,
				aria: el.aria,
				omission: mdnData.omission,
				...el,
				globalAttrs: sortObjectByKey(el.globalAttrs ?? {}),
				attributes: sortObjectByKey(
					(() => {
						const attrs = { ...el.attributes };

						for (const mdnAttr of Object.values(mdnData.attributes ?? {})) {
							if (!mdnAttr.name) {
								continue;
							}

							const current = attrs[mdnAttr.name];

							if (!current) {
								attrs[mdnAttr.name] = {
									description: mdnAttr.description,
									experimental: mdnAttr.experimental,
									obsolete: mdnAttr.obsolete,
									deprecated: mdnAttr.deprecated,
									nonStandard: mdnAttr.nonStandard,
								};
								continue;
							}

							if (typeof current === 'object') {
								if ('name' in current) {
									attrs[mdnAttr.name] = {
										// @ts-ignore for key order that "name" is first
										name: mdnAttr.name,
										// @ts-ignore for key order that "description" is second
										...mdnData.attributes,
										// @ts-ignore
										...current,
									};
								} else {
									attrs[mdnAttr.name] = {
										description: mdnAttr.description,
										experimental: mdnAttr.experimental,
										obsolete: mdnAttr.obsolete,
										deprecated: mdnAttr.deprecated,
										nonStandard: mdnAttr.nonStandard,
										...current,
									};
								}
							}
						}

						return attrs;
					})(),
				),
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
