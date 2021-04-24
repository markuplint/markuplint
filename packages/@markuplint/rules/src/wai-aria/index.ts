import { Result, createRule } from '@markuplint/ml-core';
import {
	ariaSpec,
	attrSpecs,
	checkAria,
	getComputedRole,
	getImplicitRole,
	getPermittedRoles,
	getRoleSpec,
	getSpec,
	htmlSpec,
} from '../helpers';
import { ElementVerifyWalkerFactory } from '../types';
import { MLMLSpec } from '@markuplint/ml-spec';

type Options = {
	checkingValue?: boolean;
	permittedAriaRoles?: boolean;
	disallowSetImplicitRole?: boolean;
};

const verifyWalker: ElementVerifyWalkerFactory<true, Options, MLMLSpec> = (reports, translate, spec) => node => {
	const attributeSpecs = attrSpecs(node.nodeName, spec);
	const html = htmlSpec(node.nodeName);
	const { roles } = ariaSpec();

	if (!html || !attributeSpecs) {
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
			const implicitRole = getImplicitRole(node);
			if (implicitRole && implicitRole === value) {
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

	// Checking aria-* on the role
	const computedRole = getComputedRole(node);
	if (computedRole) {
		const role = getRoleSpec(computedRole);
		if (role) {
			for (const attr of node.attributes) {
				const attrName = attr.getName().potential.trim().toLowerCase();
				if (/^aria-/i.test(attrName)) {
					const statesAndProp = role.statesAndProps.find(s => s.name === attrName);
					if (statesAndProp) {
						if (statesAndProp.deprecated) {
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

			// const requiredStateAndPropNames = role.statesAndProps.filter(s => s.required).map(s => s.name);
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

	// Checking ARIA Value
	if (node.rule.option.checkingValue) {
		for (const attr of node.attributes) {
			const attrName = attr.getName().potential.trim().toLowerCase();
			if (/^aria-/i.test(attrName)) {
				const value = attr.getValue().potential.trim().toLowerCase();
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
		}
	}
};

export default createRule<true, Options>({
	name: 'wai-aria',
	defaultLevel: 'error',
	defaultValue: true,
	defaultOptions: {
		checkingValue: true,
		permittedAriaRoles: true,
		disallowSetImplicitRole: true,
	},
	async verify(document, translate) {
		const spec = getSpec(document.schemas);
		const reports: Result[] = [];
		await document.walkOn('Element', verifyWalker(reports, translate, spec));
		return reports;
	},
	verifySync(document, translate) {
		const spec = getSpec(document.schemas);
		const reports: Result[] = [];
		document.walkOnSync('Element', verifyWalker(reports, translate, spec));
		return reports;
	},
});
