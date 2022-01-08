import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import {
	ariaSpec,
	checkAria,
	getComputedRole,
	getImplicitRole,
	getPermittedRoles,
	getRoleSpec,
	htmlSpec,
	isValidAttr,
} from '../helpers';

type Options = {
	checkingValue?: boolean;
	checkingDeprecatedProps?: boolean;
	permittedAriaRoles?: boolean;
	disallowSetImplicitRole?: boolean;
	disallowSetImplicitProps?: boolean;
	disallowDefaultValue?: boolean;
};

export default createRule<boolean, Options>({
	defaultOptions: {
		checkingValue: true,
		checkingDeprecatedProps: true,
		permittedAriaRoles: true,
		disallowSetImplicitRole: true,
		disallowSetImplicitProps: true,
		disallowDefaultValue: false,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', async node => {
			const attrSpecs = getAttrSpecs(node.nameWithNS, document.specs);
			const html = htmlSpec(node.nodeName);
			const { roles, ariaAttrs } = ariaSpec();

			if (!html || !attrSpecs) {
				return;
			}

			const roleAttrTokens = node.getAttributeToken('role');
			const roleAttr = roleAttrTokens[0];

			// Roles in the spec
			if (roleAttr) {
				const value = roleAttr.getValue().potential.trim().toLowerCase();
				const existedRole = roles.find(role => role.name === value);

				if (!existedRole) {
					// Not exist
					report({
						scope: node,
						message:
							t(
								'{0} according to {1}',
								t('{0} does not exist', t('the "{0}" {1}', value, 'role')),
								'the WAI-ARIA specification',
							) + `This "${value}" role does not exist in WAI-ARIA.`,
						line: roleAttr.startLine,
						col: roleAttr.startCol,
						raw: roleAttr.raw,
					});
				} else if (existedRole.isAbstract) {
					// the abstract role
					report({
						scope: node,
						message: t('{0} is {1}', t('the "{0}" {1}', value, 'role'), 'the abstract role'),
						line: roleAttr.startLine,
						col: roleAttr.startCol,
						raw: roleAttr.raw,
					});
				}

				// Set the implicit role explicitly
				if (node.rule.option.disallowSetImplicitRole) {
					const implictRole = getImplicitRole(node);
					if (implictRole && implictRole === value) {
						// the implicit role
						report({
							scope: node,
							message: t(
								'{0} is {1}',
								t('the "{0}" {1}', value, 'role'),
								t('{0} of {1}', 'the implicit role', t('the "{0}" {1}', node.nodeName, 'element')),
							),
							line: roleAttr.startLine,
							col: roleAttr.startCol,
							raw: roleAttr.raw,
						});
					}
				}

				// Permitted ARIA Roles
				if (node.rule.option.permittedAriaRoles) {
					const permittedRoles = getPermittedRoles(node);
					if (permittedRoles === false) {
						report({
							scope: node,
							message: t(
								'{0} according to {1}',
								t(
									'Cannot overwrite {0}',
									t('{0} of {1}', t('the {0}', 'role'), t('the "{0}" {1}', node.nodeName, 'element')),
								),
								'ARIA in HTML specification',
							),
							line: roleAttr.startLine,
							col: roleAttr.startCol,
							raw: roleAttr.raw,
						});
					} else if (Array.isArray(permittedRoles) && !permittedRoles.includes(value)) {
						report({
							scope: node,
							message: t(
								'{0} according to {1}',
								t(
									'Cannot overwrite {0} to {1}',
									t('the "{0}" {1}', value, 'role'),
									t('the "{0}" {1}', node.nodeName, 'element'),
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

			const computedRole = getComputedRole(node);
			if (computedRole) {
				const role = getRoleSpec(computedRole.name);
				if (role) {
					// Checking aria-* on the role
					for (const attr of node.attributes) {
						const attrName = attr.getName().potential.trim().toLowerCase();
						if (/^aria-/i.test(attrName)) {
							const statesAndProp = role.statesAndProps.find(s => s.name === attrName);
							if (statesAndProp) {
								if (node.rule.option.checkingDeprecatedProps && statesAndProp.deprecated) {
									report({
										scope: node,
										message: t(
											'{0:c} on {1}',
											t(
												'{0} is {1:c}',
												t('the "{0}" {1}', attrName, 'ARIA state/property'),
												'deprecated',
											),
											t('the "{0}" {1}', role.name, 'role'),
										),
										line: attr.startLine,
										col: attr.startCol,
										raw: attr.raw,
									});
								}
							} else {
								report({
									scope: node,
									message: t(
										'{0:c} on {1}',
										t(
											'{0} is {1:c}',
											t('the "{0}" {1}', attrName, 'ARIA state/property'),
											'disallowed',
										),
										t('the "{0}" {1}', role.name, 'role'),
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
							const has = node.attributes.some(attr => {
								const attrName = attr.getName().potential.trim().toLowerCase();
								return attrName === requiredProp;
							});
							if (!has) {
								report({
									scope: node,
									message: t(
										'{0:c} on {1}',
										t('Require {0}', t('the "{0}" {1}', requiredProp, 'ARIA state/property')),
										t('the "{0}" {1}', role.name, 'role'),
									),
								});
							}
						}
					}
				}
			} else {
				// No role element
				const { ariaAttrs } = ariaSpec();
				for (const attr of node.attributes) {
					const attrName = attr.getName().potential.trim().toLowerCase();
					if (/^aria-/i.test(attrName)) {
						const ariaAttr = ariaAttrs.find(attr => attr.name === attrName);
						if (ariaAttr && !ariaAttr.isGlobal) {
							report({
								scope: node,
								message: t(
									'{0} is not {1}',
									t('the "{0}" {1}', attrName, 'ARIA state/property'),
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

			for (const attr of node.attributes) {
				if (attr.attrType === 'html-attr' && attr.isDynamicValue) {
					continue;
				}
				const attrName = attr.getName().potential.trim().toLowerCase();
				if (/^aria-/i.test(attrName)) {
					const value = attr.getValue().potential.trim().toLowerCase();
					const propSpec = ariaAttrs.find(p => p.name === attrName);

					// Checking ARIA Value
					if (node.rule.option.checkingValue) {
						const result = checkAria(attrName, value, computedRole?.name);
						if (!result.isValid) {
							report({
								scope: node,
								message:
									t(
										'{0:c} on {1}',
										t('{0} is {1:c}', t('the "{0}"', value), 'disallowed'),
										t('the "{0}" {1}', attrName, 'ARIA state/property'),
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
					if (node.rule.option.disallowSetImplicitProps) {
						if (propSpec && propSpec.equivalentHtmlAttrs) {
							for (const equivalentHtmlAttr of propSpec.equivalentHtmlAttrs) {
								const htmlAttrSpec = attrSpecs.find(a => a.name === equivalentHtmlAttr.htmlAttrName);
								const isValid = isValidAttr(
									t,
									equivalentHtmlAttr.htmlAttrName,
									equivalentHtmlAttr.value || '',
									false,
									node,
									attrSpecs,
								);
								if (isValid && isValid.invalidType === 'non-existent') {
									continue;
								}
								if (node.hasAttribute(equivalentHtmlAttr.htmlAttrName)) {
									const targetAttrValue = node.getAttribute(equivalentHtmlAttr.htmlAttrName);
									if (
										(equivalentHtmlAttr.value == null && targetAttrValue === value) ||
										equivalentHtmlAttr.value === value
									) {
										report({
											scope: node,
											message: t(
												'{0} has {1}',
												t('the "{0}" {1}', attrName, 'ARIA state/property'),
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
										scope: node,
										message: t(
											'{0} contradicts {1}',
											t('the "{0}" {1}', attrName, 'ARIA state/property'),
											t('the current "{0}" {1}', equivalentHtmlAttr.htmlAttrName, 'attribute'),
										),
										line: attr.startLine,
										col: attr.startCol,
										raw: attr.raw,
									});
								} else if (value === 'true') {
									if (!equivalentHtmlAttr.isNotStrictEquivalent && htmlAttrSpec?.type === 'Boolean') {
										report({
											scope: node,
											message: t(
												'{0} contradicts {1}',
												t('the "{0}" {1}', attrName, 'ARIA state/property'),
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
					if (node.rule.option.disallowDefaultValue && propSpec && propSpec.defaultValue === value) {
						report({
							scope: node,
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
