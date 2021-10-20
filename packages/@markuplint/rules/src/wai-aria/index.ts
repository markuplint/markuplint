import {
	ariaSpec,
	checkAria,
	getAttrSpecs,
	getComputedRole,
	getImplicitRole,
	getPermittedRoles,
	getRoleSpec,
	htmlSpec,
	isValidAttr,
} from '../helpers';
import { createRule } from '@markuplint/ml-core';

type Options = {
	checkingValue?: boolean;
	checkingDeprecatedProps?: boolean;
	permittedAriaRoles?: boolean;
	disallowSetImplicitRole?: boolean;
	disallowSetImplicitProps?: boolean;
	disallowDefaultValue?: boolean;
};

export default createRule<true, Options>({
	name: 'wai-aria',
	defaultLevel: 'error',
	defaultValue: true,
	defaultOptions: {
		checkingValue: true,
		checkingDeprecatedProps: true,
		permittedAriaRoles: true,
		disallowSetImplicitRole: true,
		disallowSetImplicitProps: true,
		disallowDefaultValue: false,
	},
	async verify(context) {
		await context.document.walkOn('Element', async node => {
			const attrSpecs = getAttrSpecs(node.nodeName, node.namespaceURI, context.document.specs);
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
					context.report({
						scope: node,
						message: `This "${value}" role does not exist in WAI-ARIA.`,
						line: roleAttr.startLine,
						col: roleAttr.startCol,
						raw: roleAttr.raw,
					});
				} else if (existedRole.isAbstract) {
					// Abstract role
					context.report({
						scope: node,
						message: `This "${value}" role is the abstract role.`,
						line: roleAttr.startLine,
						col: roleAttr.startCol,
						raw: roleAttr.raw,
					});
				}

				// Set the implicit role explicitly
				if (node.rule.option.disallowSetImplicitRole) {
					const implictRole = getImplicitRole(node);
					if (implictRole && implictRole === value) {
						// Abstract role
						context.report({
							scope: node,
							message: `Don't set the implicit role explicitly because the "${value}" role is the implicit role of the ${node.nodeName} element.`,
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
						context.report({
							scope: node,
							message: `The ARIA Role of the ${node.nodeName} element cannot overwrite according to ARIA in HTML spec.`,
							line: roleAttr.startLine,
							col: roleAttr.startCol,
							raw: roleAttr.raw,
						});
					} else if (Array.isArray(permittedRoles) && !permittedRoles.includes(value)) {
						context.report({
							scope: node,
							message: `The ARIA Role of the ${node.nodeName} element cannot overwrite "${value}" according to ARIA in HTML spec.`,
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
									context.report({
										scope: node,
										message: `The ${attrName} state/property is deprecated on the ${role.name} role.`,
										line: attr.startLine,
										col: attr.startCol,
										raw: attr.raw,
									});
								}
							} else {
								context.report({
									scope: node,
									message: `Cannot use the ${attrName} state/property on the ${role.name} role.`,
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
								context.report({
									scope: node,
									message: `The ${requiredProp} state/property is required on the ${role.name} role.`,
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
							context.report({
								scope: node,
								message: `The ${attrName} is not global state/property.`,
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
							context.report({
								scope: node,
								message:
									`The "${value}" is disallowed in the ${attrName} state/property.` +
									('enum' in result && result.enum.length
										? ` Allow values are ${result.enum.join(', ')}.`
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
										context.report({
											scope: node,
											message: `Has the ${equivalentHtmlAttr.htmlAttrName} attribute that has equivalent semantic.`,
											line: attr.startLine,
											col: attr.startCol,
											raw: attr.raw,
										});
										continue;
									}
									if (htmlAttrSpec?.type === 'Boolean' && value !== 'false') {
										continue;
									}
									context.report({
										scope: node,
										message: `Can be different from the value of the ${equivalentHtmlAttr.htmlAttrName} attribute.`,
										line: attr.startLine,
										col: attr.startCol,
										raw: attr.raw,
									});
								} else if (value === 'true') {
									if (!equivalentHtmlAttr.isNotStrictEquivalent && htmlAttrSpec?.type === 'Boolean') {
										context.report({
											scope: node,
											message: `Can be in opposition to the value of the unset ${equivalentHtmlAttr.htmlAttrName} attribute.`,
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
						context.report({
							scope: node,
							message: 'It is default value',
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
