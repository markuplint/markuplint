import type { ExtendedElementSpec } from '@markuplint/ml-spec';

import type { FetchOptions } from './fetch.ts';

import { fetch } from './fetch.ts';

const MAIN_ARTICLE_SELECTOR = 'main#content';

/**
 * Reads the description of the MDN reference page of an element.
 *
 * Nothing else of the page is read: the status flags come from the sources and from the pinned
 * `@mdn/browser-compat-data` (`bcd.ts`), the names of the attributes from the sources, and the content categories
 * and the tag omission are not written at all. The description itself is dropped before the data is written
 * (`strip-prose.ts`).
 *
 * @param link - The URL of the MDN reference page
 * @param options - How a failed fetch is reported
 */
export async function fetchHTMLElement(link: string, options?: FetchOptions) {
	const $ = await fetch(link, options);
	const name = link.replace(/.+\/([\w-]+)$/, '$1').toLowerCase();
	const description = $(MAIN_ARTICLE_SELECTOR)
		.find('.reference-layout__header .content-section')
		.text()
		.trim()
		.replaceAll(/\s+/g, ' ');

	const spec: ExtendedElementSpec = {
		name,
		description,
		contentModel: {
			contents: false,
		},
		aria: {
			implicitRole: false,
			permittedRoles: true,
		},
		attributes: {},
	};

	return spec;
}
