import type { Element } from '@markuplint/ml-core';
import type { PlainData } from '@markuplint/ml-config';

/**
 * Shared by the two rules split out of the former `landmark-roles` rule:
 * `no-nested-top-level-landmark` and `require-landmark-label`. Both need the
 * same set of landmark-role elements; only what each rule does with that set
 * differs.
 */

/** Landmark roles that APG requires to be top-level (not nested in another landmark). */
export type TopLevelRoles = 'banner' | 'main' | 'contentinfo' | 'complementary';

/** All recognized ARIA landmark roles for these rules. */
export type Roles = TopLevelRoles | 'form' | 'navigation' | 'region';

/** A mapping from each landmark role to its matched elements in the document. */
export type RoleSet<O extends PlainData> = {
	[role in Roles]: Element<boolean, O>[];
};

/** CSS selectors used to identify elements with each landmark role. */
const selectors: { readonly [role in Roles]: string[] } = {
	complementary: ['[role="complementary"]', 'aside'],
	contentinfo: ['[role="contentinfo"]'],
	form: ['[role="form"]', 'form[aria-labelledby]', 'form[aria-label]', 'form[title]'],
	banner: ['[role="banner"]'],
	main: ['[role="main"]', 'main'],
	navigation: ['[role="navigation"]', 'nav'],
	region: ['[role="region"]', 'section[aria-labelledby]', 'section[aria-label]', 'section[title]'],
};

/**
 * Collects every landmark-role element in the document, keyed by role.
 *
 * @param document - The document to search.
 * @returns The mapping from role to its matched elements.
 */
export function computeLandmarkRoles<O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	document: {
		querySelectorAll(selector: string): Iterable<Element<boolean, O>>;
	},
): RoleSet<O> {
	const roles: RoleSet<O> = {
		complementary: [...document.querySelectorAll(selectors.complementary.join(','))],
		contentinfo: [...document.querySelectorAll(selectors.contentinfo.join(','))],
		form: [...document.querySelectorAll(selectors.form.join(','))],
		banner: [...document.querySelectorAll(selectors.banner.join(','))],
		main: [...document.querySelectorAll(selectors.main.join(','))],
		navigation: [...document.querySelectorAll(selectors.navigation.join(','))],
		region: [...document.querySelectorAll(selectors.region.join(','))],
	};

	/**
	 * `<header>`
	 *
	 * @cite https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
	 *
	 * > When in context of the body element. The header element is not a banner landmark when it is a descendant of the following HTML sectioning elements:
	 * > - article
	 * > - aside
	 * > - main
	 * > - nav
	 * > - section
	 */
	const headers = [...document.querySelectorAll('header')].filter(header => {
		return !header.closest('article, aside, main, nav, section');
	});
	roles.banner.push(...headers);

	/**
	 * `<footer>`
	 *
	 * @cite https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
	 *
	 * > When in context of the body element. The footer element is not a contentinfo landmark when it is a descendant of the following HTML sectioning elements:
	 * > - article
	 * > - aside
	 * > - main
	 * > - nav
	 * > - section
	 */
	const footers = [...document.querySelectorAll('footer')].filter(footer => {
		return !footer.closest('article, aside, main, nav, section');
	});
	roles.contentinfo.push(...footers);

	return roles;
}

/**
 * Collects all UUIDs of elements that have landmark roles.
 *
 * @param roleset - The mapping of roles to their matched elements.
 * @returns A flat array of UUIDs for all landmark role elements.
 */
export function landmarkRoleElementUUIDList<O extends PlainData>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	roleset: RoleSet<O>,
) {
	return Object.values(roleset).flatMap(elements => elements.map(element => element.uuid));
}
