import type { Options } from './types';

import { createRule, getAttrSpecs, getComputedRole, ariaSpecs, getSpec } from '@markuplint/ml-core';

import { Collection } from '../helpers';

import { checkingAbstractRole } from './checkings/abstract-role';
import { checkingDefaultValue } from './checkings/default-value';
import { checkingDeprecatedProps } from './checkings/deprecated-props';
import { checkingDisallowedProp } from './checkings/disallowed-prop';
import { checkingImplicitProps } from './checkings/implicit-props';
import { checkingImplicitRole } from './checkings/implicit-role';
import { checkingNoGlobalProp } from './checkings/no-global-prop';
import { checkingNonExistantRole } from './checkings/non-existant-role';
import { checkingPermittedRoles } from './checkings/permitted-roles';
import { checkingRequiredProp } from './checkings/required-prop';
import { checkingValue } from './checkings/value';

export default createRule<boolean, Options>({
	defaultOptions: {
		checkingValue: true,
		checkingDeprecatedProps: true,
		permittedAriaRoles: true,
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

			if (!roleAttr && propAttrs.length === 0) {
				return;
			}

			const elSpec = getSpec(el, document.specs);
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

			const role = getComputedRole(document.specs, el, el.rule.option.version);
			const { props: propSpecs } = ariaSpecs(document.specs, el.rule.option.version);

			if (roleAttr) {
				report(checkingNonExistantRole({ attr: roleAttr }));
				report(checkingAbstractRole({ attr: roleAttr }));
				report(checkingRequiredProp({ el, role, propSpecs }));

				if (el.rule.option.disallowSetImplicitRole) {
					report(checkingImplicitRole({ attr: roleAttr }));
				}

				if (el.rule.option.permittedAriaRoles) {
					report(checkingPermittedRoles({ attr: roleAttr }));
				}
			}

			for (const attr of propAttrs) {
				report(checkingDisallowedProp({ attr, role, propSpecs }));

				if (el.rule.option.checkingDeprecatedProps) {
					report(checkingDeprecatedProps({ attr, role, propSpecs }));
				}

				if (el.rule.option.disallowSetImplicitProps) {
					const attrSpecs = getAttrSpecs(el, document.specs);
					report(checkingImplicitProps({ attr, propSpecs, attrSpecs }));
				}

				if (el.rule.option.checkingValue) {
					report(checkingValue({ attr, role, propSpecs }));
				}

				if (el.rule.option.disallowDefaultValue) {
					report(checkingDefaultValue({ attr, propSpecs }));
				}

				if (!role) {
					report(checkingNoGlobalProp({ attr, propSpecs }));
				}
			}
		});
	},
});
