import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import { readJsons } from './read-json.js';
import { fetchHTMLElement, fetchObsoleteElements } from './scraping.js';
import { getSVGElementList } from './svg.js';
import { getName, nameCompare, sortObjectByKey } from './utils.js';

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
 * Builds the complete list of HTML and SVG element specifications by reading local JSON spec files,
 * enriching them with data scraped from MDN, and appending obsolete/deprecated elements.
 * Elements are sorted alphabetically with SVG elements placed after HTML elements.
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

	const deprecatedList = await getSVGElementList();

	const obsoleteElements = fetchObsoleteElements([...obsoleteList, ...deprecatedList], specs);
	specs.push(...obsoleteElements);

	specs = await Promise.all(
		specs.map(async el => {
			const { localName, namespace, ml } = getName(el.name);
			const urlTagName = /^h[1-6]$/i.test(localName) ? 'Heading_Elements' : localName;
			// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a
			// https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/a
			const cite = `https://developer.mozilla.org/en-US/docs/Web/${ml}/Reference/Element${ml === 'HTML' ? 's' : ''}/${urlTagName}`;
			const mdnData = await fetchHTMLElement(cite);
			// @ts-ignore
			delete el.name;
			// @ts-ignore
			delete el.namespace;
			const spec = {
				// @ts-ignore
				name: namespace === 'http://www.w3.org/2000/svg' ? `svg:${localName}` : localName,
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

	return specs
		.toSorted(nameCompare)
		.toSorted((a, b) => (a.namespace == b.namespace ? 0 : a.namespace === 'http://www.w3.org/2000/svg' ? 1 : -1));
}
