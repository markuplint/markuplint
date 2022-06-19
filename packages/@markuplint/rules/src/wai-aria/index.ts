import type { ARIAVersion } from '@markuplint/ml-spec';

import {
	createRule,
	getAttrSpecs,
	getRoleSpec,
	getComputedRole,
	getPermittedRoles,
	getImplicitRole,
	ariaSpecs,
	getSpec,
} from '@markuplint/ml-core';

import { checkAria, isValidAttr } from '../helpers';

type Options = {
	checkingValue: boolean;
	checkingDeprecatedProps: boolean;
	permittedAriaRoles: boolean;
	disallowSetImplicitRole: boolean;
	disallowSetImplicitProps: boolean;
	disallowDefaultValue: boolean;
	version: ARIAVersion;
};

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
			const attrSpecs = getAttrSpecs(el, document.specs);
			const html = getSpec(el, document.specs);
			const { roles, ariaAttrs } = ariaSpecs(document.specs);

			if (!html || !attrSpecs) {
				return;
			}

			const roleAttr = el.getAttributeNode('role');

			// Roles in the spec
			if (roleAttr) {
				const value = roleAttr.value.trim().toLowerCase();
				const existedRole = roles.find(role => role.name === value);

				if (!existedRole) {
					// Not exist
					report({
						scope: el,
						message:
							t(
								'{0} according to {1}',
								t('{0} does not exist', t('the "{0*}" {1}', value, 'role')),
								'the WAI-ARIA specification',
							) +
							t('.') +
							// TODO: Translate
							` This "${value}" role does not exist in WAI-ARIA.`,
						line: roleAttr.startLine,
						col: roleAttr.startCol,
						raw: roleAttr.raw,
					});
				} else if (existedRole.isAbstract) {
					// the abstract role
					report({
						scope: el,
						message: t('{0} is {1}', t('the "{0*}" {1}', value, 'role'), 'the abstract role'),
						line: roleAttr.startLine,
						col: roleAttr.startCol,
						raw: roleAttr.raw,
					});
				}

				// Set the implicit role explicitly
				if (el.rule.option.disallowSetImplicitRole) {
					const implictRole = getImplicitRole(el, el.rule.option.version, document.specs);
					if (implictRole && implictRole === value) {
						// the implicit role
						report({
							scope: el,
							message: t(
								'{0} is {1}',
								t('the "{0*}" {1}', value, 'role'),
								t('{0} of {1}', 'the implicit role', t('the "{0*}" {1}', el.localName, 'element')),
							),
							line: roleAttr.startLine,
							col: roleAttr.startCol,
							raw: roleAttr.raw,
						});
					}
				}

				// Permitted ARIA Roles
				if (el.rule.option.permittedAriaRoles) {
					const permittedRoles = getPermittedRoles(el, el.rule.option.version, document.specs);
					if (permittedRoles === false) {
						report({
							scope: el,
							message: t(
								'{0} according to {1}',
								t(
									'Cannot overwrite {0}',
									t('{0} of {1}', t('the {0}', 'role'), t('the "{0*}" {1}', el.localName, 'element')),
								),
								'ARIA in HTML specification',
							),
							line: roleAttr.startLine,
							col: roleAttr.startCol,
							raw: roleAttr.raw,
						});
					} else if (Array.isArray(permittedRoles) && !permittedRoles.includes(value)) {
						report({
							scope: el,
							message: t(
								'{0} according to {1}',
								t(
									'Cannot overwrite {0} to {1}',
									t('the "{0*}" {1}', value, 'role'),
									t('the "{0*}" {1}', el.localName, 'element'),
								),
								'ARIA in HTML specification',
							),
							line: roleAttr.startLine,
							col: roleAttr.startCol,
							raw: roleAttr.raw,
						});
					}
				}
			}

			const computedRole = getComputedRole(document.specs, el, el.rule.option.version);
			if (computedRole) {
				const role = getRoleSpec(document.specs, computedRole.name);
				if (role) {
					// Checking aria-* on the role
					for (const attr of el.attributes) {
						const attrName = attr.name.toLowerCase();
						if (/^aria-/i.test(attrName)) {
							const statesAndProp = role.statesAndProps.find(s => s.name === attrName);
							if (statesAndProp) {
								if (el.rule.option.checkingDeprecatedProps && statesAndProp.deprecated) {
									report({
										scope: el,
										message: t(
											'{0:c} on {1}',
											t(
												'{0} is {1:c}',
												t('the "{0*}" {1}', attrName, 'ARIA state/property'),
												'deprecated',
											),
											t('the "{0*}" {1}', role.name, 'role'),
										),
										line: attr.startLine,
										col: attr.startCol,
										raw: attr.raw,
									});
								}
							} else {
								report({
									scope: el,
									message: t(
										'{0:c} on {1}',
										t(
											'{0} is {1:c}',
											t('the "{0*}" {1}', attrName, 'ARIA state/property'),
											'disallowed',
										),
										t('the "{0*}" {1}', role.name, 'role'),
									),
									line: attr.startLine,
									col: attr.startCol,
									raw: attr.raw,
								});
							}
						}
					}

					// Checing required props
					if (!computedRole.isImplicit) {
						const requiredProps = role.statesAndProps.filter(s => s.required).map(s => s.name);
						for (const requiredProp of requiredProps) {
							const has = el.attributes.some(attr => {
								const attrName = attr.name.toLowerCase();
								return attrName === requiredProp;
							});
							if (!has) {
								report({
									scope: el,
									message: t(
										'{0:c} on {1}',
										t('Require {0}', t('the "{0*}" {1}', requiredProp, 'ARIA state/property')),
										t('the "{0*}" {1}', role.name, 'role'),
									),
								});
							}
						}
					}
				}
			} else {
				// No role element
				for (const attr of el.attributes) {
					const attrName = attr.name.toLowerCase();
					if (/^aria-/i.test(attrName)) {
						const ariaAttr = ariaAttrs.find(attr => attr.name === attrName);
						if (ariaAttr && !ariaAttr.isGlobal) {
							report({
								scope: el,
								message: t(
									'{0} is not {1}',
									t('the "{0*}" {1}', attrName, 'ARIA state/property'),
									'global state/property',
								),
								line: attr.startLine,
								col: attr.startCol,
								raw: attr.raw,
							});
						}
					}
				}
			}

			for (const attr of el.attributes) {
				if (attr.isDynamicValue) {
					continue;
				}
				const attrName = attr.name.toLowerCase();
				if (/^aria-/i.test(attrName)) {
					const value = attr.value.trim().toLowerCase();
					const propSpec = ariaAttrs.find(p => p.name === attrName);

					// Checking ARIA Value
					if (el.rule.option.checkingValue) {
						const result = checkAria(document.specs, attrName, value, computedRole?.name);
						if (!result.isValid) {
							report({
								scope: el,
								message:
									t(
										'{0:c} on {1}',
										t('{0} is {1:c}', t('the "{0}"', value), 'disallowed'),
										t('the "{0*}" {1}', attrName, 'ARIA state/property'),
									) +
									('enum' in result && result.enum.length
										? t('. ') + t('Allowed values are: {0}', t(result.enum))
										: ''),
								line: attr.startLine,
								col: attr.startCol,
								raw: attr.raw,
							});
						}
					}

					// Checking implicit props
					if (el.rule.option.disallowSetImplicitProps) {
						if (propSpec && propSpec.equivalentHtmlAttrs) {
							for (const equivalentHtmlAttr of propSpec.equivalentHtmlAttrs) {
								const htmlAttrSpec = attrSpecs.find(a => a.name === equivalentHtmlAttr.htmlAttrName);
								const isValid = isValidAttr(
									t,
									equivalentHtmlAttr.htmlAttrName,
									equivalentHtmlAttr.value || '',
									false,
									el,
									attrSpecs,
								);
								if (isValid && isValid.invalidType === 'non-existent') {
									continue;
								}
								if (el.hasAttribute(equivalentHtmlAttr.htmlAttrName)) {
									const targetAttrValue = el.getAttribute(equivalentHtmlAttr.htmlAttrName);
									if (
										(equivalentHtmlAttr.value == null && targetAttrValue === value) ||
										equivalentHtmlAttr.value === value
									) {
										report({
											scope: el,
											message: t(
												'{0} has {1}',
												t('the "{0*}" {1}', attrName, 'ARIA state/property'),
												t(
													'the same {0} as {1}',
													'semantics',
													t(
														'{0} or {1}',
														t(
															'the current "{0}" {1}',
															equivalentHtmlAttr.htmlAttrName,
															'attribute',
														),
														t(
															'the implicit "{0}" {1}',
															equivalentHtmlAttr.htmlAttrName,
															'attribute',
														),
													),
												),
											),
											line: attr.startLine,
											col: attr.startCol,
											raw: attr.raw,
										});
										continue;
									}
									if (htmlAttrSpec?.type === 'Boolean' && value !== 'false') {
										continue;
									}
									report({
										scope: el,
										message: t(
											'{0} contradicts {1}',
											t('the "{0*}" {1}', attrName, 'ARIA state/property'),
											t('the current "{0}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
										),
										line: attr.startLine,
										col: attr.startCol,
										raw: attr.raw,
									});
								} else if (value === 'true') {
									if (!equivalentHtmlAttr.isNotStrictEquivalent && htmlAttrSpec?.type === 'Boolean') {
										report({
											scope: el,
											message: t(
												'{0} contradicts {1}',
												t('the "{0*}" {1}', attrName, 'ARIA state/property'),
												t(
													'the implicit "{0}" {1}',
													equivalentHtmlAttr.htmlAttrName,
													'attribute',
												),
											),
											line: attr.startLine,
											col: attr.startCol,
											raw: attr.raw,
										});
									}
								}
							}
						}
					}

					// Default value
					if (el.rule.option.disallowDefaultValue && propSpec && propSpec.defaultValue === value) {
						report({
							scope: el,
							message: t('It is {0}', 'default value'),
							line: attr.startLine,
							col: attr.startCol,
							raw: attr.raw,
						});
					}
				}
			}
		});
	},
});
