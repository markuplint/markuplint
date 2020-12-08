import { Result, createRule } from '@markuplint/ml-core';
import { ariaSpec, attrSpecs, getRermittedRoles, getRoleSpec, getSpec, htmlSpec } from '../helpers';

export default createRule<true, null>({
	name: 'wai-aria',
	defaultLevel: 'error',
	defaultValue: true,
	defaultOptions: null,
	async verify(document, translate) {
		const spec = getSpec(document.schemas);
		const reports: Result[] = [];

		await document.walkOn('Element', async node => {
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

			// Checking aria-*
			const currentRole = roleAttr?.getValue().potential.trim().toLowerCase() || null; // TODO: or its implicit role
			if (currentRole) {
				const role = getRoleSpec(currentRole);
				if (role) {
					for (const attr of node.attributes) {
						const attrName = attr.getName().potential.trim().toLowerCase();
						if (/^aria-/i.test(attrName)) {
							if (!role.statesAndProps.includes(attrName)) {
								reports.push({
									severity: node.rule.severity,
									message: `The ${attrName} state/property cannot use on the ${role.name} role.`,
									line: attr.startLine,
									col: attr.startCol,
									raw: attr.raw,
								});
							}
						}
					}
				}
			}
			// TODO: No role element

			// Permitted ARIA Roles
			const permittedRoles = getRermittedRoles(node);
			if (permittedRoles === false) {
				reports.push({
					severity: node.rule.severity,
					message: `The ARIA Role of the ${node.nodeName} element cannot overwrite according to ARIA in HTML spec.`,
					line: roleAttr.startLine,
					col: roleAttr.startCol,
					raw: roleAttr.raw,
				});
			}
		});

		return reports;
	},
});
