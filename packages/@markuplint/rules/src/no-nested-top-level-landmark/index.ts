import { createRule } from '@markuplint/ml-core';

import { computeLandmarkRoles, landmarkRoleElementUUIDList } from '../landmark-roles/roles.js';
import meta from './meta.js';

import type { Roles, TopLevelRoles } from '../landmark-roles/roles.js';

/**
 * Configuration options for the `no-nested-top-level-landmark` rule.
 */
type Options = {
	/** Landmark roles to exclude from validation. */
	ignoreRoles: Roles[];
};

/**
 * Roles this rule requires to be top-level landmarks — not nested inside any
 * other landmark.
 *
 * Split from the former `landmark-roles` rule (#3989), unchanged: APG's
 * Landmark Regions practice also requires `complementary` to be top-level,
 * but this rule deliberately does not check it. `<aside>`'s implicit role is
 * conditional under ARIA 1.3 (v5's default version) — nested inside certain
 * sectioning ancestors it demotes to `generic`, not `complementary` — and
 * this rule's selector-based detection (`landmark-roles/roles.ts`) has no way
 * to tell the two apart, so checking `complementary` here would produce
 * false positives for legitimately generic asides. See the v4→v5 ARIA
 * migration guide's "`<aside>` conditional role mapping" section for the
 * full history of that decision.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
 */
const topLevelRoles: TopLevelRoles[] = ['banner', 'main', 'contentinfo'];

export default createRule<boolean, Options>({
	meta,
	defaultSeverity: 'warning',
	defaultOptions: {
		ignoreRoles: [],
	},
	verify({ document, report, t }) {
		if (document.isFragment) {
			return;
		}

		const roles = computeLandmarkRoles<Options>(document);
		const uuidList = landmarkRoleElementUUIDList(roles);

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
	},
});
