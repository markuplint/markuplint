import { Element, MLRuleOptions, Result, createRule } from '@markuplint/ml-core';

type Options = {
	ignoreRoles: Roles[];
	labelEachArea: boolean;
};

type TopLevelRoles = 'banner' | 'main' | 'complementary' | 'contentinfo';

type Roles = TopLevelRoles | 'form' | 'navigation' | 'region';

type RoleSet = {
	[role in Roles]: Element<boolean, Options>[];
};

const selectors: { [role in Roles]: string[] } = {
	complementary: ['[role="complementary"]', 'aside'],
	contentinfo: ['[role="contentinfo"]'],
	form: ['[role="form"]', 'form[aria-labelledby]', 'form[aria-label]', 'form[title]'],
	banner: ['[role="banner"]'],
	main: ['[role="main"]', 'main'],
	navigation: ['[role="navigation"]', 'nav'],
	region: ['[role="region"]', 'section[aria-labelledby]', 'section[aria-label]', 'section[title]'],
};

const topLevelRoles: TopLevelRoles[] = ['banner', 'main', 'complementary', 'contentinfo'];

const verifySync: MLRuleOptions<boolean, Options>['verifySync'] = (document, translate) => {
	if (document.isFragment) {
		return [];
	}

	const reports: Result[] = [];

	const roles: RoleSet = {
		complementary: document.matchNodes(selectors.complementary.join(',')),
		contentinfo: document.matchNodes(selectors.contentinfo.join(',')),
		form: document.matchNodes(selectors.form.join(',')),
		banner: document.matchNodes(selectors.banner.join(',')),
		main: document.matchNodes(selectors.main.join(',')),
		navigation: document.matchNodes(selectors.navigation.join(',')),
		region: document.matchNodes(selectors.region.join(',')),
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
	const headers = document.matchNodes('header').filter(header => {
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
	const footers = document.matchNodes('footer').filter(footer => {
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

			if (el.rule.option.ignoreRoles.includes(role)) {
				continue;
			}

			if (el.isDescendantByUUIDList(uuidList)) {
				reports.push({
					severity: el.rule.severity,
					message: translate('{0} should be {1}', role, 'top level'),
					line: el.startLine,
					col: el.startCol,
					raw: el.raw,
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

			if (!el.rule.option.labelEachArea) {
				continue;
			}

			if (!hasLabel(el)) {
				reports.push({
					severity: el.rule.severity,
					message: translate(
						'Should have a unique label because {0} landmarks were markup more than once on a page',
						role,
					),
					line: el.startLine,
					col: el.startCol,
					raw: el.raw,
				});
			}
		}
	}

	return reports;
};

export default createRule<boolean, Options>({
	name: 'landmark-roles',
	defaultLevel: 'warning',
	defaultValue: true,
	defaultOptions: {
		ignoreRoles: [],
		labelEachArea: true,
	},
	verify: verifySync,
	verifySync,
});

function landmarkRoleElementUUIDList(roleset: RoleSet) {
	return Object.values(roleset)
		.map(elements => elements.map(element => element.uuid))
		.flat();
}

function hasLabel(el: Element<boolean, Options>) {
	const hasHeading = !!el.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
	if (hasHeading && el.matches('[aria-labelledby]')) {
		return true;
	}

	return el.matches('[aria-label]');
}
