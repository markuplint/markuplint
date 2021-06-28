import { Result, createRule } from '@markuplint/ml-core';
import {
	ariaSpec,
	checkAria,
	getAttrSpecs,
	getComputedRole,
	getImplicitRole,
	getPermittedRoles,
	getRoleSpec,
	htmlSpec,
} from '../helpers';

type Options = {
	checkingValue?: boolean;
	checkingDeprecatedProps?: boolean;
	permittedAriaRoles?: boolean;
	disallowSetImplicitRole?: boolean;
	disallowSetImplicitProps?: boolean;
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
	},
	async verify(document, translate) {
		const reports: Result[] = [];

		await document.walkOn('Element', async node => {
			const attrSpecs = getAttrSpecs(node.nodeName, document.specs);
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
					reports.push({
						severity: node.rule.severity,
						message: `This "${value}" role does not exist in WAI-ARIA.`,
						line: roleAttr.startLine,
						col: roleAttr.startCol,
						raw: roleAttr.raw,
					});
				} else if (existedRole.isAbstract) {
					// Abstract role
					reports.push({
						severity: node.rule.severity,
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
						reports.push({
							severity: node.rule.severity,
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
						reports.push({
							severity: node.rule.severity,
							message: `The ARIA Role of the ${node.nodeName} element cannot overwrite according to ARIA in HTML spec.`,
							line: roleAttr.startLine,
							col: roleAttr.startCol,
							raw: roleAttr.raw,
						});
					} else if (Array.isArray(permittedRoles) && !permittedRoles.includes(value)) {
						reports.push({
							severity: node.rule.severity,
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
									reports.push({
										severity: node.rule.severity,
										message: `The ${attrName} state/property is deprecated on the ${role.name} role.`,
										line: attr.startLine,
										col: attr.startCol,
										raw: attr.raw,
									});
								}
							} else {
								reports.push({
									severity: node.rule.severity,
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
								reports.push({
									severity: node.rule.severity,
									message: `The ${requiredProp} state/property is required on the ${role.name} role.`,
									line: node.startLine,
									col: node.startCol,
									raw: node.raw,
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
							reports.push({
								severity: node.rule.severity,
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

					// Checking ARIA Value
					if (node.rule.option.checkingValue) {
						const result = checkAria(attrName, value);
						if (!result.isValid) {
							reports.push({
								severity: node.rule.severity,
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
						const propSpec = ariaAttrs.find(p => p.name === attrName);
						if (propSpec && propSpec.equivalentHtmlAttrs) {
							for (const equivalentHtmlAttr of propSpec.equivalentHtmlAttrs) {
								if (node.hasAttribute(equivalentHtmlAttr.htmlAttrName)) {
									const targetAttrValue = node.getAttribute(equivalentHtmlAttr.htmlAttrName);
									if (
										(equivalentHtmlAttr.value == null && targetAttrValue === value) ||
										equivalentHtmlAttr.value === value
									) {
										reports.push({
											severity: node.rule.severity,
											message: `Has the ${equivalentHtmlAttr.htmlAttrName} attribute that has equivalent semantic.`,
											line: attr.startLine,
											col: attr.startCol,
											raw: attr.raw,
										});
										continue;
									}
									reports.push({
										severity: node.rule.severity,
										message: `Can be different from the value of the ${equivalentHtmlAttr.htmlAttrName} attribute.`,
										line: attr.startLine,
										col: attr.startCol,
										raw: attr.raw,
									});
								}
							}
						}
					}
				}
			}
		});

		return reports;
	},
});
