import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule, getAttrSpecs, ariaSpecs } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { findAttrSpec, getDOMValue } from '../helpers.js';

import meta from './meta.js';

/**
 * Reports a reference (an attribute of the `DOMID` type, or an ARIA property of the ID reference
 * type) to an id that does not exist.
 *
 * An id is resolved in the tree of the reference: the document, the content of a `template` element
 * and a declarative shadow root are trees of their own. The reference and the id are compared with
 * the character references in the markup resolved.
 *
 * What it cannot tell it does not report: a document with a template-language block is skipped, an id
 * that is not known until it is rendered (a dynamic value) suppresses the report in its tree only, and
 * a `template` that is in no tree (a declarative shadow root is attached to its parent, or may be)
 * refers to nothing.
 *
 * @see https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute
 */
export default createRule({
	meta: meta,
	defaultOptions: {
		ariaVersion: undefined as ARIAVersion | undefined,
	},
	async verify({ document, report, t }) {
		// An id is resolved in the tree of the reference: the document, the content of a `template`
		// element and a declarative shadow root are trees of their own
		const idListOfTree = new Map<object, Set<string>>();
		const treesWithDynamicId = new Set<object>();

		const isMutable = document.nodeList.some(node => node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK));

		if (isMutable) {
			return;
		}

		for (const el of document.deepQuerySelectorAll('[id]')) {
			const attr = el.getAttributeNode('id');
			if (!attr) {
				continue;
			}
			const root = el.getRootNode();
			if (attr.isDynamicValue) {
				treesWithDynamicId.add(root);
			}
			const id = attr.valueType === 'code' ? null : getDOMValue(attr);
			if (id != null) {
				let idList = idListOfTree.get(root);
				if (!idList) {
					idList = new Set();
					idListOfTree.set(root, idList);
				}
				idList.add(id);
			}
		}

		await document.walkOn('Attr', attr => {
			const attrSpec = getAttrSpecs(attr.ownerElement, document.specs);

			if (!attrSpec) {
				return;
			}

			if (attr.isDynamicValue) {
				return;
			}

			if (attr.nameKey === 'id') {
				return;
			}

			const root = attr.ownerElement.getRootNode();

			// An element in no tree (a `template` that a declarative shadow root is attached to) refers
			// to nothing, and an id that is not known until it is rendered may be what the reference means
			if (root === attr.ownerElement || treesWithDynamicId.has(root)) {
				return;
			}

			const idList = idListOfTree.get(root) ?? new Set<string>();

			// The value is split before the character references are resolved: `&#32;` is not a separator
			const decode = (id: string) => getDOMValue(attr, id) ?? id;
			const value = decode(attr.value);

			const spec = findAttrSpec(attrSpec, attr);

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
					const refs = attr.value
						.split(spec.type.separator === 'space' ? /\s/ : ',')
						.map(id => id.trim())
						.filter(Boolean)
						.map(id => decode(id));

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

			const aria = props.find(prop => prop.name === attr.nameKey);
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
					const refs = attr.value
						.split(/\s/)
						.map(id => id.trim())
						.filter(Boolean)
						.map(id => decode(id));

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
