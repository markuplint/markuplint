import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { valueCheck } from '../attr-check.js';

import meta from './meta.js';

export default createRule<boolean>({
	meta: meta,
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Attr', attr => {
			if (!attr.valueNode) {
				return;
			}

			const attrSpecs = getAttrSpecs(attr.ownerElement, document.specs);

			if (!attrSpecs) {
				return;
			}

			const attrSpec = attrSpecs.find(spec => spec.name === attr.name);

			if (attrSpec?.type !== 'NavigableTargetNameOrKeyword' && attrSpec?.type !== 'NavigableTargetName') {
				return;
			}

			const value = attr.value.trim();

			if (value.startsWith('_')) {
				// This is a keyword
				return;
			}

			const valueWithUnderscore = `_${value}`;

			const invalid = valueCheck(t, attr.name, valueWithUnderscore, 'NavigableTargetNameOrKeyword');

			if (invalid !== false) {
				return;
			}

			report({
				scope: attr,
				line: attr.valueNode.startLine,
				col: attr.valueNode.startCol,
				raw: attr.valueNode.raw,
				message:
					//
					t("don't use {0}", t('a {0}', t('ambiguous {0}', 'navigable target name'))) +
					(attrSpec.type === 'NavigableTargetNameOrKeyword'
						? t('. ') + t('Did you mean "{0}"?', valueWithUnderscore)
						: ''),
			});
		});
	},
});
