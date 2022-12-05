import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';

import { ariaSpecs } from '@markuplint/ml-spec';

export const checkingAbstractRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const { roles } = ariaSpecs(attr.ownerMLDocument.specs, attr.rule.options.version);
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
