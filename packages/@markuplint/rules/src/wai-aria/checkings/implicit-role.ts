import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';

import { getImplicitRoleName } from '@markuplint/ml-spec';

export const checkingImplicitRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const implictRole = getImplicitRoleName(
			attr.ownerElement,
			attr.rule.option.version,
			attr.ownerMLDocument.specs,
		);
		const tokens = attr.tokenList?.allTokens();
		if (!tokens) {
			return;
		}
		for (const token of tokens) {
			if (implictRole === token.raw) {
				return {
					scope: token,
					message: t(
						'{0} is {1}',
						t('the "{0*}" {1}', token.raw, 'role'),
						t(
							'{0} of {1}',
							'the implicit role',
							t('the "{0*}" {1}', attr.ownerElement.localName, 'element'),
						),
					),
				};
			}
		}
	};
