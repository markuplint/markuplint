import { createRule, getSpec } from '@markuplint/ml-core';
import { getAriaOwnsTarget, isCircularAriaOwnsReference } from '@markuplint/ml-spec';

import meta from './meta.js';

/**
 * WAI-ARIA 1.3, the `aria-owns` property:
 *
 * > Authors MUST NOT create circular references with aria-owns.
 *
 * A reference is circular when the element it refers to is the element itself or an ancestor of it in
 * the accessibility tree, where the ancestors follow the DOM and every `aria-owns`
 * (`isCircularAriaOwnsReference` of `@markuplint/ml-spec`). Every reference of a cycle is reported at its ID,
 * as each of them closes it. The rule reports under every ARIA version, although the aria-owns property
 * of WAI-ARIA 1.1 and 1.2 does not state the requirement.
 *
 * An ID is resolved as `aria-owns` resolves it (`getAriaOwnsTarget` of `@markuplint/ml-spec`), and an
 * ID that no element has is left to `no-refer-to-non-existent-id`. A document with a template-language
 * block, or an `aria-owns` whose value is not known until it is rendered, is not judged.
 *
 * @see https://w3c.github.io/aria/#aria-owns
 */
export default createRule<boolean>({
	meta,
	defaultSeverity: 'error',
	async verify({ document, report, t }) {
		if (document.nodeList.some(node => node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK))) {
			return;
		}

		await document.walkOn('Element', el => {
			const attr = el.getAttributeNode('aria-owns');
			if (!attr || attr.isAbsent || attr.isDynamicValue) {
				return;
			}
			if (!getSpec(el, document.specs.specs)?.globalAttrs['#ARIAAttrs']) {
				return;
			}
			const reported = new Set<string>();
			for (const token of attr.tokenList?.allTokens() ?? []) {
				const id = token.raw;
				if (reported.has(id)) {
					continue;
				}
				const target = getAriaOwnsTarget(el, id);
				if (!target || !isCircularAriaOwnsReference(el, target)) {
					continue;
				}
				reported.add(id);
				report({
					scope: token,
					message: t('Referring to {0} from "aria-owns" makes a cycle', t('the {0}', t('"{0*}" ID', id))),
				});
			}
		});
	},
});
