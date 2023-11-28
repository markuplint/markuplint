import type { Options } from '../types';
import type { AttrChecker } from '@markuplint/ml-core';
import type { ARIAProperty, ARIARole } from '@markuplint/ml-spec';

import { getARIA } from '@markuplint/ml-spec';

export const checkingDisallowedProp: AttrChecker<
	boolean,
	Options,
	{ role: ARIARole | null; propSpecs: readonly ARIAProperty[] }
> =
	({ attr, role, propSpecs }) =>
	t => {
		if (!role) {
			return;
		}
		if (!/^aria-/i.test(attr.name)) {
			return;
		}
		const statesAndProp = role.ownedProperties.find(p => p.name === attr.name);
		const propSpec = propSpecs.find(p => p.name === attr.name);
		const elAriaSpec = getARIA(
			attr.ownerMLDocument.specs,
			attr.ownerElement.localName,
			attr.ownerElement.namespaceURI,
			attr.rule.options.version,
			attr.ownerElement.matches.bind(attr.ownerElement),
		);
		if (elAriaSpec?.properties !== false && elAriaSpec?.properties?.without) {
			for (const ignore of elAriaSpec.properties.without) {
				if (ignore.name === attr.name) {
					return {
						scope: attr,
						message:
							t(
								'{0:c} on {1}',
								t(
									ignore.type === 'must-not'
										? '{0} must not {1}'
										: ignore.type === 'should-not'
										  ? '{0} should not {1}'
										  : '{0} is not recommended to {1}',
									// {0}
									t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`),
									// {1}
									'use',
								),
								t('the "{0*}" {1}', attr.ownerElement.localName, 'element'),
							) +
							(ignore.alt
								? t('. ') +
								  t(
										'{0} if you {1} {2}',
										t(
											ignore.alt.method === 'remove-attr' ? 'Remove {0}' : 'Add {0}',
											t('the "{0*}" {1}', ignore.alt.target, 'attribute'),
										),
										'use',
										t('the {0}', `ARIA ${propSpec?.type ?? 'property'}`),
								  )
								: ''),
					};
				}
			}
		}
		if (statesAndProp) {
			return;
		}
		return {
			scope: attr,
			message: t(
				'{0:c} on {1}',
				t('{0} is {1:c}', t('the "{0*}" {1}', attr.name, `ARIA ${propSpec?.type ?? 'property'}`), 'disallowed'),
				t('the "{0*}" {1}', role.name, 'role'),
			),
		};
	};
