import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule, getAttrSpecs, ariaSpecs } from '@markuplint/ml-core';

export default createRule({
	defaultOptions: {
		ariaVersion: '1.2' as ARIAVersion,
	},
	async verify({ document, report, t }) {
		const idList = new Set<string>();
		let hasDynamicId = false;

		await document.walkOn('Attr', attr => {
			if (attr.name.toLowerCase() !== 'id') {
				return;
			}
			if (attr.isDynamicValue) {
				hasDynamicId = true;
			}
			if (attr.valueType !== 'code') {
				idList.add(attr.value);
			}
		});

		if (hasDynamicId) {
			return;
		}

		await document.walkOn('Attr', attr => {
			const attrSpec = getAttrSpecs(attr.ownerElement, document.specs);

			if (!attrSpec) {
				return;
			}

			if (attr.isDynamicValue) {
				return;
			}

			const name = attr.name;

			if (name.toLowerCase() === 'id') {
				return;
			}

			const value = attr.value;

			const spec = attrSpec.find(s => s.name === name);

			if (spec) {
				// DOMID and DOMID List do not become in the array type.
				if (Array.isArray(spec.type)) {
					return;
				}

				if (spec.type === 'DOMID' && !idList.has(value)) {
					report({
						scope: attr,
						line: attr.valueNode?.startLine,
						col: attr.valueNode?.startCol,
						raw: attr.valueNode?.raw,
						message: t('Missing {0}', t('"{0*}" ID', value)),
					});
				}

				if (typeof spec.type !== 'string' && 'token' in spec.type && spec.type.token === 'DOMID') {
					const refs = value
						.split(spec.type.separator === 'space' ? /\s/ : ',')
						.map(id => id.trim())
						.filter(_ => _);

					for (const ref of refs) {
						if (!idList.has(ref)) {
							report({
								scope: attr,
								line: attr.valueNode?.startLine,
								col: attr.valueNode?.startCol,
								raw: attr.valueNode?.raw,
								message: t('Missing {0}', t('"{0*}" ID', ref)),
							});
						}
					}
				}
			}

			const { props } = ariaSpecs(document.specs, attr.rule.options.ariaVersion);

			const aria = props.find(prop => prop.name === name);
			if (aria) {
				if (aria.value === 'ID reference' && !idList.has(value)) {
					report({
						scope: attr,
						line: attr.valueNode?.startLine,
						col: attr.valueNode?.startCol,
						raw: attr.valueNode?.raw,
						message: t('Missing {0}', t('"{0*}" ID', value)),
					});
				} else if (aria.value === 'ID reference list') {
					const refs = value
						.split(/\s/)
						.map(id => id.trim())
						.filter(_ => _);

					for (const ref of refs) {
						if (!idList.has(ref)) {
							report({
								scope: attr,
								line: attr.valueNode?.startLine,
								col: attr.valueNode?.startCol,
								raw: attr.valueNode?.raw,
								message: t('Missing {0}', t('"{0*}" ID', ref)),
							});
						}
					}
				}
			}
		});
	},
});
