import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import { readJsons } from './read-json';
import { fetchHTMLElement, fetchObsoleteElements } from './scraping';
import { getSVGElementList } from './svg';
import { getName, nameCompare, sortObjectByKey } from './utils';

/**
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

export async function getElements() {
	let specs = await readJsons<ExtendedElementSpec>('../src/spec.*.json', (file, body) => {
		const name = file.replace(/^.+spec\.([a-z0-9_-]+)+\.json$/i, '$1');
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
			const cite = `https://developer.mozilla.org/en-US/docs/Web/${ml}/Element/${localName}`;
			const mdnData = await fetchHTMLElement(cite);
			// @ts-ignore
			delete el.name;
			// @ts-ignore
			delete el.namespace;
			return {
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
				globalAttrs: sortObjectByKey(el.globalAttrs || {}),
				attributes: sortObjectByKey(
					(() => {
						const attrs = { ...el.attributes };

						for (const mdnAttr of Object.values(mdnData.attributes || {})) {
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

							if (typeof current === 'object' && 'name' in current) {
								attrs[mdnAttr.name] = {
									// @ts-ignore for key order that "name" is first
									name: mdnAttr.name,
									// @ts-ignore for key order that "description" is second
									...mdnData.attributes,
									// @ts-ignore
									...current,
								};
							}
						}

						return attrs;
					})(),
				),
			};
		}),
	);

	return specs
		.sort(nameCompare)
		.sort((a, b) => (a.namespace == b.namespace ? 0 : a.namespace === 'http://www.w3.org/2000/svg' ? 1 : -1))
		.filter(spec => spec.name !== 'h1-h6');
}
