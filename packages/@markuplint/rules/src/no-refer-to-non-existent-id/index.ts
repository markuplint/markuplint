import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule, getAttrSpecs, ariaSpecs } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { decodeEntities } from '@markuplint/shared';

import meta from './meta.js';

export default createRule({
	meta: meta,
	defaultOptions: {
		ariaVersion: undefined as ARIAVersion | undefined,
	},
	async verify({ document, report, t }) {
		const idList = new Set<string>();
		let hasDynamicId = false;

		const isMutable = document.nodeList.some(node => node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK));

		if (isMutable) {
			return;
		}

		for (const el of document.querySelectorAll('[id]')) {
			const attr = el.getAttributeNode('id');
			if (!attr) {
				continue;
			}
			if (attr.isDynamicValue) {
				hasDynamicId = true;
			}
			if (attr.valueType !== 'code') {
				idList.add(decodeEntities(attr.value));
			}
		}

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

				if (typeof spec.type !== 'string' && 'separator' in spec.type && spec.type.token === 'DOMID') {
					const refs = value
						.split(spec.type.separator === 'space' ? /\s/ : ',')
						.map(id => id.trim())
						.filter(Boolean);

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

			const { props } = ariaSpecs(
				document.specs,
				attr.rule.options.ariaVersion ?? document.ruleCommonSettings?.ariaVersion ?? ARIA_RECOMMENDED_VERSION,
			);

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
						.filter(Boolean);

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
