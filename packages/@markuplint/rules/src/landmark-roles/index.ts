import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

type Options = {
	ignoreRoles: Roles[];
	labelEachArea: boolean;
};

type TopLevelRoles = 'banner' | 'main' | 'complementary' | 'contentinfo';

type Roles = TopLevelRoles | 'form' | 'navigation' | 'region';

type RoleSet = {
	[role in Roles]: Element<boolean, Options>[];
};

const selectors: { readonly [role in Roles]: string[] } = {
	complementary: ['[role="complementary"]', 'aside'],
	contentinfo: ['[role="contentinfo"]'],
	form: ['[role="form"]', 'form[aria-labelledby]', 'form[aria-label]', 'form[title]'],
	banner: ['[role="banner"]'],
	main: ['[role="main"]', 'main'],
	navigation: ['[role="navigation"]', 'nav'],
	region: ['[role="region"]', 'section[aria-labelledby]', 'section[aria-label]', 'section[title]'],
};

const topLevelRoles: TopLevelRoles[] = ['banner', 'main', 'complementary', 'contentinfo'];

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

function landmarkRoleElementUUIDList(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	roleset: RoleSet,
) {
	return Object.values(roleset).flatMap(elements => elements.map(element => element.uuid));
}

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
