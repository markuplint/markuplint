import { createRule, getSpec } from '@markuplint/ml-core';
import { getAriaOwnsTarget, getFirstAriaOwnsReferrer } from '@markuplint/ml-spec';

import meta from './meta.js';

/**
 * WAI-ARIA, the `aria-owns` property:
 *
 * > Authors MUST ensure that an element's ID is not specified in more than one other element's
 * > aria-owns attribute at any time. In other words, an element can have only one explicit owner.
 *
 * Every `aria-owns` after the first one in tree order that lists an ID is reported, at the ID. The
 * first one is the one `getFirstAriaOwnsReferrer` of `@markuplint/ml-spec` reads from the markup, so
 * an element of any kind counts there, the ones this rule does not judge included. Which of them a user
 * agent takes as the owner also depends on the excluded ones it does not resolve, and does not change
 * that all but one are errors.
 *
 * An ID is resolved as `aria-owns` resolves it (`getAriaOwnsTarget` of `@markuplint/ml-spec`: the first
 * element with the ID in the tree of the `aria-owns`), and an ID that no element has is left to
 * `no-refer-to-non-existent-id`. An element that lists its own ID is a circular reference
 * (`no-circular-aria-owns`), not an owner of another element. A document with a template-language
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
				if (!target || target === el) {
					continue;
				}
				const first = getFirstAriaOwnsReferrer(target);
				if (!first || first === el) {
					continue;
				}
				reported.add(id);
				report({
					scope: token,
					message: t(
						'{0} is already referred to by the "aria-owns" of another element',
						t('the {0}', t('"{0*}" ID', id)),
					),
				});
			}
		});
	},
});
