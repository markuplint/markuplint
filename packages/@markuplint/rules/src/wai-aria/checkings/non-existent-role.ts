import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';

import { ariaSpecs } from '@markuplint/ml-spec';

export const checkingNonExistentRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const { roles, graphicsRoles } = ariaSpecs(attr.ownerMLDocument.specs, attr.rule.option.version);
		const tokens = attr.tokenList?.allTokens();
		if (!tokens) {
			return;
		}
		for (const token of tokens) {
			let role = roles.find(r => r.name === token.raw);
			if (!role && attr.ownerElement.namespaceURI === 'http://www.w3.org/2000/svg') {
				role = graphicsRoles.find(r => r.name === token.raw);
			}
			if (!role) {
				return {
					scope: token,
					message:
						t(
							'{0} according to {1}',
							t('{0} does not exist', t('the "{0*}" {1}', token.raw, 'role')),
							'the WAI-ARIA specification',
						) +
						t('.') +
						// TODO: Translate
						` This "${token.raw}" role does not exist in WAI-ARIA.`,
				};
			}
		}
	};
