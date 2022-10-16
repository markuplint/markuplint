import type { Options } from './types';

import { createRule, getAttrSpecs, getComputedRole, ariaSpecs, getSpec } from '@markuplint/ml-core';

import { Collection } from '../helpers';

import { checkingAbstractRole } from './checkings/abstract-role';
import { checkingDefaultValue } from './checkings/default-value';
import { checkingDeprecatedProps } from './checkings/deprecated-props';
import { checkingDisallowedProp } from './checkings/disallowed-prop';
import { checkingImplicitProps } from './checkings/implicit-props';
import { checkingImplicitRole } from './checkings/implicit-role';
import { checkingInteractionInHidden } from './checkings/interaction-in-hidden';
import { checkingNoGlobalProp } from './checkings/no-global-prop';
import { checkingNonExistentRole } from './checkings/non-existent-role';
import { checkingPermittedRoles } from './checkings/permitted-roles';
import { checkingPresentationalChildren } from './checkings/presentational-children';
import { checkingRequiredOwnedElements } from './checkings/required-owned-elements';
import { checkingRequiredProp } from './checkings/required-prop';
import { checkingValue } from './checkings/value';

export default createRule<boolean, Options>({
	defaultOptions: {
		checkingValue: true,
		checkingDeprecatedProps: true,
		permittedAriaRoles: true,
		checkingRequiredOwnedElements: true,
		checkingPresentationalChildren: false,
		checkingInteractionInHidden: false,
		disallowSetImplicitRole: true,
		disallowSetImplicitProps: true,
		disallowDefaultValue: false,
		version: '1.2',
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			const roleAttr = el.getAttributeNode('role');
			const propAttrs = el.attributes.filter(attr => /^aria-/i.test(attr.name));

			const ariaAttrs = new Collection(roleAttr, ...propAttrs);

			const elSpec = getSpec(el, document.specs.specs);
			if (!elSpec) {
				return;
			}

			if (!elSpec.globalAttrs['#ARIAAttrs']) {
				for (const ariaAttr of ariaAttrs) {
					report({
						scope: ariaAttr,
						message: 'ARIA attribute is disallowed',
					});
				}
				return;
			}

			const computed = getComputedRole(document.specs, el, el.rule.option.version);
			const { props: propSpecs } = ariaSpecs(document.specs, el.rule.option.version);

			if (roleAttr) {
				if (report(checkingNonExistentRole({ attr: roleAttr }))) {
					return;
				}

				if (report(checkingAbstractRole({ attr: roleAttr }))) {
					return;
				}
				report(checkingRequiredProp({ el, role: computed.role, propSpecs }));

				if (el.rule.option.disallowSetImplicitRole) {
					report(checkingImplicitRole({ attr: roleAttr }));
				}

				if (el.rule.option.permittedAriaRoles) {
					report(checkingPermittedRoles({ attr: roleAttr }));
				}
			}

			for (const attr of propAttrs) {
				report(checkingDisallowedProp({ attr, role: computed.role, propSpecs }));

				if (el.rule.option.checkingDeprecatedProps) {
					report(checkingDeprecatedProps({ attr, role: computed.role, propSpecs }));
				}

				if (el.rule.option.disallowSetImplicitProps) {
					const attrSpecs = getAttrSpecs(el, document.specs);
					report(checkingImplicitProps({ attr, propSpecs, attrSpecs }));
				}

				if (el.rule.option.checkingValue) {
					report(checkingValue({ attr, role: computed.role, propSpecs, booleanish: document.booleanish }));
				}

				if (el.rule.option.disallowDefaultValue) {
					report(checkingDefaultValue({ attr, propSpecs }));
				}

				if (!computed.role) {
					report(checkingNoGlobalProp({ attr, propSpecs }));
				}
			}

			if (el.rule.option.checkingRequiredOwnedElements) {
				report(checkingRequiredOwnedElements({ el, role: computed.role }));
			}

			if (el.rule.option.checkingPresentationalChildren) {
				report(checkingPresentationalChildren({ el }));
			}

			if (el.rule.option.checkingInteractionInHidden) {
				report(checkingInteractionInHidden({ el }));
			}
		});
	},
});
