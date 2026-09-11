import type { Options } from '../types.js';
import type { AttrChecker } from '@markuplint/ml-core';

import { ARIA_RECOMMENDED_VERSION, ariaSpecs } from '@markuplint/ml-spec';

/**
 * Checks whether the `role` attribute value refers to an abstract WAI-ARIA role.
 *
 * Abstract roles (e.g., `widget`, `landmark`) are used for ontological purposes
 * in the ARIA taxonomy and must not be used directly in content.
 *
 * @param attr - The `role` attribute node to inspect.
 * @returns A violation if any token in the role attribute is an abstract role.
 */
export const checkingAbstractRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const ariaVersion =
			attr.rule.options?.version ??
			attr.ownerMLDocument.ruleCommonSettings?.ariaVersion ??
			ARIA_RECOMMENDED_VERSION;
		const { roles } = ariaSpecs(attr.ownerMLDocument.specs, ariaVersion);
		const tokens = attr.tokenList?.allTokens();
		if (!tokens) {
			return;
		}
		for (const token of tokens) {
			const role = roles.find(r => r.name === token.raw);
			if (role?.isAbstract) {
				return {
					scope: token,
					message: t('{0} is {1}', t('the "{0*}" {1}', token.raw, 'role'), 'the abstract role'),
				};
			}
		}
	};
