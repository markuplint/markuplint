import type { Element } from '@markuplint/ml-core';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { createRule, getAttrSpecs, ariaSpecs, withPretenderDeclaredElements } from '@markuplint/ml-core';
import { ARIA_RECOMMENDED_VERSION, hasElementOfUnknownId } from '@markuplint/ml-spec';
import { splitOnAsciiWhitespace, trimAsciiWhitespace } from '@markuplint/shared';

import { findAttrSpec, getDOMValue } from '../helpers.js';

import meta from './meta.js';

/**
 * Reports a reference (an attribute of the `DOMID` type, or an ARIA property of the ID reference
 * type) to an id that does not exist.
 *
 * An id is resolved in the tree of the reference: the document, the content of a `template` element
 * and a declarative shadow root are trees of their own. The reference and the id are compared with
 * the character references in the markup resolved. What a pretender declares (the slot wrappers and the
 * static entries of `contents`) is rendered by the component, so its ids are the ids of the tree the
 * component is in (`getPretenderDeclaredElements` of `@markuplint/ml-core`).
 *
 * What it cannot tell it does not report: a tree that may hold an element whose id the markup does not
 * tell (a dynamic value, a spread attribute, a component that no pretender resolved, content that is not
 * known) is skipped, and only that tree, and a `template` that is in no tree (a declarative shadow root
 * is attached to its parent, or may be) refers to nothing. An id that another file may hold is not
 * looked for: the file is taken to be the whole document.
 *
 * Whether the tree may hold such an element is `hasElementOfUnknownId` of `@markuplint/ml-spec`, which
 * `labelledbyMayReferToUnknownId` of the same package reads as well (an element whose `aria-labelledby`
 * refers to it has a name: `isValidLandmarkRole`, `MLElement#mayHaveAccessibleName` of
 * `@markuplint/ml-core`, `:aria(has name)` of `@markuplint/selector` and `accnameMayComeFromUnknownContent`
 * of `../helpers.ts` ask it), and which asks
 * `MLElement#treeMayHoldUnknownId` of `@markuplint/ml-core` (what counts is in the module comment of its
 * `helper/unknown-id.ts`): a change to it belongs to all of them.
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

		const collectId = (el: Element<any, any>) => {
			const attr = el.getAttributeNode('id');
			if (!attr) {
				return;
			}
			const root = el.getRootNode();
			const id = attr.valueType === 'code' ? null : getDOMValue(attr);
			if (id != null) {
				let idList = idListOfTree.get(root);
				if (!idList) {
					idList = new Set();
					idListOfTree.set(root, idList);
				}
				idList.add(id);
			}
		};

		// What a pretender declares is rendered in the tree of the pretended element, and is in no `nodeList`.
		// Every element is read, as an element that has no `id` may be a pretender that declares one.
		for (const el of withPretenderDeclaredElements(document.deepQuerySelectorAll('*'))) {
			collectId(el);
		}

		await document.walkOn('Attr', attr => {
			// Of two attributes of one name, the element has the other one (`no-duplicate-attr` reports this one)
			if (attr.overridden) {
				return;
			}
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
			// to nothing, and an element whose id the markup does not tell may be what the reference means
			if (root === attr.ownerElement || hasElementOfUnknownId(attr.ownerElement)) {
				return;
			}

			const idList = idListOfTree.get(root) ?? new Set<string>();

			// `MLAttr#value` is the value the DOM has: its character references are decoded, so `&#32;` separates
			// two ids as a space does
			const value = attr.value;

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
					const tokens =
						spec.type.separator === 'space'
							? splitOnAsciiWhitespace(attr.value)
							: attr.value
									.split(',')
									.map(id => trimAsciiWhitespace(id))
									.filter(Boolean);
					const refs = tokens;

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
					const refs = splitOnAsciiWhitespace(attr.value);

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
