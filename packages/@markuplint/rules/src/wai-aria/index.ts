import { Result, createRule } from '@markuplint/ml-core';
import { ariaSpec, attrSpecs, getSpec, htmlSpec } from '../helpers';

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
						message: `This "${value}" role is not exist in WAI-ARIA.`,
						line: roleAttr.startLine,
						col: roleAttr.startCol,
						raw: roleAttr.raw,
					});
				}
			}
		});

		return reports;
	},
});
