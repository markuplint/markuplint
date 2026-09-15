import type { Element } from '@markuplint/ml-core';

import { createRule } from '@markuplint/ml-core';

import { computeLandmarkRoles } from '../landmark-roles/roles.js';
import meta from './meta.js';

import type { Roles } from '../landmark-roles/roles.js';

/**
 * Split from the former `landmark-roles` rule (#3989): when a document has
 * more than one landmark of the same role, each occurrence needs a unique
 * accessible name so assistive technology users can tell them apart, per
 * APG's Landmark Regions practice. The former rule's `labelEachArea` option
 * gated this check; disabling this rule entirely is how to opt out now.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
 */
export default createRule<boolean>({
	meta,
	defaultSeverity: 'warning',
	verify({ document, report, t }) {
		if (document.isFragment) {
			return;
		}

		const roles = computeLandmarkRoles(document);

		for (const role of Object.keys(roles) as Roles[]) {
			const roleEls = roles[role];
			const duplicated = 1 < roleEls.length;
			if (!duplicated) {
				continue;
			}

			for (const el of roleEls) {
				if (el.rule.disabled) {
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
 * Checks whether an element has an accessible label via `aria-label` or `aria-labelledby`.
 *
 * @param el - The landmark element to check.
 * @returns `true` if the element has an accessible name, `false` otherwise.
 */
function hasLabel(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: Element<boolean>,
) {
	const hasHeading = el.querySelectorAll('h1, h2, h3, h4, h5, h6').length > 0;
	if (hasHeading && el.matches('[aria-labelledby]')) {
		return true;
	}

	return el.matches('[aria-label]');
}
