import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Configuration options for the landmark-roles rule.
 */
type Options = {
	/** Landmark roles to exclude from validation. */
	ignoreRoles: Roles[];
	/** Whether to require a unique accessible name when duplicate landmark roles exist. */
	labelEachArea: boolean;
};

/** Landmark roles that should appear at the top level of the document. */
type TopLevelRoles = 'banner' | 'main' | 'contentinfo';

/** All recognized ARIA landmark roles for this rule. */
type Roles = TopLevelRoles | 'complementary' | 'form' | 'navigation' | 'region';

/** A mapping from each landmark role to its matched elements in the document. */
type RoleSet = {
	[role in Roles]: Element<boolean, Options>[];
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

/** Roles that are required to be top-level landmarks per WAI-ARIA practices. */
const topLevelRoles: TopLevelRoles[] = ['banner', 'main', 'contentinfo'];

export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {
		ignoreRoles: [],
		labelEachArea: true,
	},
	verify({ document, report, t }) {
		if (document.isFragment) {
			return;
		}

		const roles: RoleSet = {
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
		 * @cite https://www.w3.org/TR/wai-aria-practices/examples/landmarks/HTML5.html
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
		 * @cite https://www.w3.org/TR/wai-aria-practices/examples/landmarks/HTML5.html
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

		const uuidList = landmarkRoleElementUUIDList(roles);

		// @cite https://www.w3.org/TR/wai-aria-practices/examples/landmarks/index.html
		// > `banner`, `main`, `complementary` and `contentinfo` landmarks should be top level landmarks.
		for (const role of topLevelRoles) {
			const elements = roles[role];
			for (const el of elements) {
				if (el.rule.disabled) {
					continue;
				}

				if (el.rule.options.ignoreRoles?.includes(role)) {
					continue;
				}

				if (el.isDescendantByUUIDList(uuidList)) {
					report({
						scope: el,
						message: t('{0} should be {1}', t('the "{0*}" {1}', role, 'role'), 'top level'),
					});
				}
			}
		}

		for (const role of Object.keys(roles)) {
			const roleEls = roles[role as Roles];
			const duplicated = 1 < roleEls.length;
			if (!duplicated) {
				continue;
			}

			for (const el of roleEls) {
				if (el.rule.disabled) {
					continue;
				}

				if (!el.rule.options.labelEachArea) {
					continue;
				}

				if (!hasLabel(el)) {
					report({
						scope: el,
						message: t('Require {0}', t('unique {0}', 'accessible name')),
					});
				}
			}
		}
	},
});

/**
 * Collects all UUIDs of elements that have landmark roles.
 *
 * @param roleset - The mapping of roles to their matched elements.
 * @returns A flat array of UUIDs for all landmark role elements.
 */
function landmarkRoleElementUUIDList(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	roleset: RoleSet,
) {
	return Object.values(roleset).flatMap(elements => elements.map(element => element.uuid));
}

/**
 * Checks whether an element has an accessible label via `aria-label` or `aria-labelledby`.
 *
 * @param el - The landmark element to check.
 * @returns `true` if the element has an accessible name, `false` otherwise.
 */
function hasLabel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean, Options>,
) {
	const hasHeading = el.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
	if (hasHeading && el.matches('[aria-labelledby]')) {
		return true;
	}

	return el.matches('[aria-label]');
}
