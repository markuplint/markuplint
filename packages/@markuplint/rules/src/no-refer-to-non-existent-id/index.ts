import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { ariaSpec } from '../helpers';

export default createRule({
	async verify({ document, report, t }) {
		const { ariaAttrs } = ariaSpec();

		const idList = new Set<string>();
		let hasDynamicId = false;

		await document.walkOn('Element', el => {
			for (const attr of el.attributes) {
				if (attr.getName().potential.toLowerCase() !== 'id') {
					continue;
				}
				if (attr.attrType === 'html-attr') {
					if (attr.isDynamicValue) {
						hasDynamicId = true;
					}
					idList.add(attr.getValue().potential);
				} else {
					if (attr.valueType !== 'code') {
						idList.add(attr.getValue().potential);
					}
				}
			}
		});

		if (hasDynamicId) {
			return;
		}

		document.walkOn('Element', el => {
			const attrSpec = getAttrSpecs(el.nameWithNS, document.specs);

			if (!attrSpec) {
				return;
			}

			for (const attr of el.attributes) {
				if (attr.attrType !== 'html-attr' || attr.isDynamicValue) {
					continue;
				}

				const name = attr.getName().potential;

				if (name.toLowerCase() === 'id') {
					continue;
				}

				const value = attr.getValue().potential;

				const spec = attrSpec.find(s => s.name === name);

				if (spec) {
					// DOMID and DOMID List do not become in the array type.
					if (Array.isArray(spec.type)) {
						continue;
					}

					if (spec.type === 'DOMID' && !idList.has(value)) {
						report({
							scope: el,
							line: attr.value.startLine,
							col: attr.value.startCol,
							raw: attr.value.raw,
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
									scope: el,
									line: attr.value.startLine,
									col: attr.value.startCol,
									raw: attr.value.raw,
									message: t('Missing {0}', t('"{0*}" ID', ref)),
								});
							}
						}
					}
				}

				const aria = ariaAttrs.find(aria => aria.name === name);
				if (aria) {
					if (aria.value === 'ID reference' && !idList.has(value)) {
						report({
							scope: el,
							line: attr.value.startLine,
							col: attr.value.startCol,
							raw: attr.value.raw,
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
									scope: el,
									line: attr.value.startLine,
									col: attr.value.startCol,
									raw: attr.value.raw,
									message: t('Missing {0}', t('"{0*}" ID', ref)),
								});
							}
						}
					}
				}
			}
		});
	},
});
