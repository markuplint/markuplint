import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Detects a `<label>` that is not associated with any control: it has no
 * descendant elements at all and no `for` attribute. This is the only check
 * this rule performs — a `<label>` with an excess of descendant controls is
 * `label-no-multiple-controls`'s responsibility, which also accounts for the
 * `for`-references-an-external-control case that this rule does not see.
 *
 * An element inside a conditional preprocessor block counts, because the
 * branch that renders it puts that element in the label's tree:
 *
 * > If the `for` attribute is not specified, but the `label` element has a labelable element descendant, then the first such descendant in tree order is the `label` element's labeled control.
 *
 * @see https://html.spec.whatwg.org/multipage/forms.html#labeled-control
 *
 * `children` does not list that element, because a conditional block is not
 * flattened into `childNodes`. This rule still treats any element in
 * `children` or in a `conditionalChildNodes()` branch as enough; it does not
 * check that the element is labelable.
 *
 * A block that is not a fragment and has no `blockBehavior` is neither
 * flattened nor a branch, so an element that exists only inside it is not
 * counted. A Svelte `{#snippet}` is that kind of block: its body is a
 * definition, not a branch rendered where the block is written.
 */
export default createRule({
	meta: meta,
	defaultSeverity: 'warning',
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.localName !== 'label') {
				return;
			}

			// If the label is a pretender, the descendants are unknown, so end the verification.
			// However, if the `as` attribute is explicitly specified, the descendant relationship is clear,
			// so verify it as a normal element.
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) {
				return;
			}

			// `for` already associates the label, so the branch walk is wasted there.
			// `children` already includes elements of an `each` block. A conditional
			// block is not flattened, so look through its branches only when
			// `children` is empty. One branch that contains an element is enough:
			// the branches that never render together stay out of `children`.
			if (el.hasAttribute('for')) {
				return;
			}
			const hasElementInSomeBranch =
				el.children.length > 0 ||
				el.conditionalChildNodes().some(branch => [...branch].some(node => node.is(node.ELEMENT_NODE)));
			if (!hasElementInSomeBranch) {
				report({
					scope: el,
					message: t(
						'{0} should associate with {1}',
						t('The "{0*}" {1}', 'label', 'element'),
						t('a {0}', 'control'),
					),
				});
			}
		});
	},
});
