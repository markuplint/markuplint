import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';

import { ariaSpecs } from '@markuplint/ml-spec';

export const checkingNonExistantRole: AttrChecker<boolean, Options> =
	({ attr }) =>
	t => {
		const { roles } = ariaSpecs(attr.ownerMLDocument.specs, attr.rule.option.version);
		const role = roles.find(r => r.name === attr.value);
		if (!role) {
			return {
				scope: attr,
				message:
					t(
						'{0} according to {1}',
						t('{0} does not exist', t('the "{0*}" {1}', attr.value, 'role')),
						'the WAI-ARIA specification',
					) +
					t('.') +
					// TODO: Translate
					` This "${attr.value}" role does not exist in WAI-ARIA.`,
			};
		}
	};
