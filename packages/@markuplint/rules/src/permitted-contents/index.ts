import type { ChildNode, Mode, Options, TagRule } from './types.js';
import type { Translator } from '@markuplint/i18n';

import { createRule } from '@markuplint/ml-core';

import { contentModel } from './content-model.js';
import meta from './meta.js';
import { transparentMode } from './represent-transparent-nodes.js';

/**
 * The `permitted-contents` rule validates that each element's child nodes conform
 * to the HTML content model specification. It is the most complex rule in markuplint,
 * implementing a full content model validation engine that handles ordered sequences,
 * quantified patterns (require, optional, oneOrMore, zeroOrMore), choice alternations,
 * transparent content models, and conditional child node branches.
 *
 * For each element, it resolves the applicable content model (from the HTML spec or
 * user-defined tag rules), evaluates the element's children against that model, and
 * reports violations such as unexpected elements, missing required elements, or
 * disallowed content through transparent models. It also checks forbidden ancestor
 * constraints — elements like `<header>`, `<footer>`, `<main>`, and `<address>` must
 * not appear as descendants of certain other elements as defined by the HTML spec.
 * Additionally, it enforces required ancestor constraints (`descendantOf`) — certain
 * elements must appear as descendants of specific other elements. It also validates
 * sibling-unique attribute constraints (`uniqueAttrs`) — certain attributes must not
 * appear on more than one element of the same type within the same parent.
 */
export default createRule<TagRule[], Options>({
	meta: meta,
	defaultValue: [],
	defaultOptions: {
		ignoreHasMutableChildren: true,
		evaluateConditionalChildNodes: false,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			// Check forbidden ancestors
			const elSpec = document.specs.specs.find(s => s.name === el.localName);
			const forbiddenAncestors = elSpec?.contentModel?.forbiddenAncestors;
			if (forbiddenAncestors && forbiddenAncestors.length > 0) {
				let ancestor = el.parentElement;
				while (ancestor) {
					if (forbiddenAncestors.some(selector => ancestor!.matches(selector))) {
						report({
							scope: el,
							message: t(
								'{0} must not appear as a descendant of {1}',
								t('the "{0}" {1}', el.localName, 'element'),
								t('the "{0}" {1}', ancestor.localName, 'element'),
							),
						});
						break;
					}
					ancestor = ancestor.parentElement;
				}
			}

			// Check required ancestor (descendantOf)
			const descendantOf = elSpec?.contentModel?.descendantOf;
			if (descendantOf) {
				let ancestor = el.parentElement;
				let found = false;
				while (ancestor) {
					if (ancestor.matches(descendantOf)) {
						found = true;
						break;
					}
					ancestor = ancestor.parentElement;
				}
				if (!found) {
					report({
						scope: el,
						message: t(
							'{0} must appear as a descendant of {1}',
							t('the "{0}" {1}', el.localName, 'element'),
							t('the "{0}" {1}', descendantOf, 'element'),
						),
					});
				}
			}

			// Check unique attributes among siblings of the same type
			const uniqueAttrs = elSpec?.contentModel?.uniqueAttrs;
			if (uniqueAttrs && uniqueAttrs.length > 0) {
				for (const attrName of uniqueAttrs) {
					if (!el.hasAttribute(attrName)) {
						continue;
					}
					const parent = el.parentElement;
					if (!parent) {
						continue;
					}
					// Only report on the second (and subsequent) element that has the attribute
					const precedingSiblings = [...parent.children];
					const elIndex = precedingSiblings.indexOf(el);
					const hasPrecedingDuplicate = precedingSiblings
						.slice(0, elIndex)
						.some(child => child.localName === el.localName && child.hasAttribute(attrName));
					if (hasPrecedingDuplicate) {
						report({
							scope: el,
							message: t(
								'The "{0}" attribute must not appear on more than one "{1}" element within the same parent',
								attrName,
								el.localName,
							),
						});
					}
				}
			}

			// Build the mode list. `'pretended'` always runs and preserves the historical
			// behaviour. `'origin'` additionally fires when the element is pretending and
			// the user has declared a content model keyed on its original AST name, so
			// that user-defined custom-tag rules are not silently bypassed by pretending
			// (see issue #3739).
			const modes: Mode[] = ['pretended'];
			if (el.pretenderContext?.type === 'pretender' && el.rule.value.some(r => r.tag === el.rawName)) {
				modes.push('origin');
			}

			for (const mode of modes) {
				const results = contentModel(el, el.rule.value, el.rule.options, mode);
				for (const { type, scope, query, hint } of results) {
					let message = '';

					if (hint.max != null) {
						message =
							t('there is more content than it needs') +
							t('. ') +
							t('the max number of elements required is {0}', `${hint.max}`);
					}

					switch (type) {
						case 'MATCHED':
						case 'MATCHED_ZERO': {
							break;
						}
						case 'MISSING_NODE_ONE_OR_MORE': {
							if (
								scope.rule.options.ignoreHasMutableChildren &&
								(!scope.is(scope.ELEMENT_NODE) || scope.hasMutableChildren())
							) {
								break;
							}

							message =
								message ||
								t('Require {0}', t('one or more elements')) +
									t('. ') +
									'(' +
									t('Need "{0*}"', query) +
									')';

							report({
								scope,
								message,
							});
							break;
						}
						case 'MISSING_NODE_REQUIRED': {
							if (
								scope.rule.options.ignoreHasMutableChildren &&
								(!scope.is(scope.ELEMENT_NODE) || scope.hasMutableChildren())
							) {
								break;
							}

							message =
								message ||
								t('Require {0}', t('an {0}', 'element')) +
									t('. ') +
									'(' +
									t('Need "{0*}"', query) +
									')';

							report({
								scope,
								message,
							});
							break;
						}
						case 'UNEXPECTED_EXTRA_NODE': {
							const not = hint.not ?? scope;

							message =
								message ||
								(transparentMode.has(scope)
									? t(
											'{0} is not allowed in {1} through the transparent model in this context',
											name(not, t, mode),
											name(el, t, mode),
										)
									: t(
											'{0} is not allowed in {1} in this context',
											name(not, t, mode),
											name(el, t, mode),
										));

							report({
								scope: not,
								message,
							});
							break;
						}
						case 'TRANSPARENT_MODEL_DISALLOWS': {
							const not = hint.not ?? scope;
							const tp = hint.transparent ?? el;

							report({
								scope: not,
								message: t(
									'{0} is {1} but {2}',
									name(tp, t, mode),
									t('a {0}', 'transparent model'),
									t('also disallows {0} in this context', name(not, t, mode)),
								),
							});
							break;
						}
						case 'NOTHING': {
							report({
								scope: el,
								message: t('{0} disallows {1}', t('the {0}', 'element'), 'contents'),
							});
							break;
						}
						default: {
							throw new Error('Unreachable code');
						}
					}
				}

				// Clear the per-element transparent-model tracker between passes so that
				// errors reported in one mode do not carry the "through the transparent
				// model" phrasing into the other mode's diagnostics.
				transparentMode.clear();
			}
		});
	},
});

/**
 * Generates a localized, human-readable name for a child node based on its type.
 * Used in error messages to describe the offending node (e.g., 'the "div" element',
 * 'the text node', 'the comment', 'the doctype', 'the code block').
 *
 * In `'origin'` mode, uses {@link MLElement.rawName} so that the diagnostic refers
 * to the original AST identity (e.g. the component name `"Breadcrumbs"`) rather
 * than the pretender target (`"nav"`). `'pretended'` mode preserves the historical
 * behaviour and prints the visible `localName`.
 *
 * @param scope - The child node to generate a name for.
 * @param t - The translator function for localized message formatting.
 * @param mode - Which identity to surface in the message.
 * @returns A localized string describing the node.
 */
function name(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	scope: ChildNode,
	t: Translator,
	mode: Mode,
) {
	if (scope.is(scope.ELEMENT_NODE)) {
		const displayName = mode === 'origin' ? scope.rawName : scope.localName;
		return t('the "{0}" {1}', displayName, 'element');
	}
	if (scope.is(scope.TEXT_NODE)) {
		return t('the {0}', 'text node');
	}
	if (scope.is(scope.CDATA_SECTION_NODE)) {
		return t('the {0}', 'comment');
	}
	if (scope.is(scope.DOCUMENT_TYPE_NODE)) {
		return t('the {0}', 'doctype');
	}
	if (scope.is(scope.MARKUPLINT_PREPROCESSOR_BLOCK)) {
		return t('the {0}', 'code block');
	}
	return t('the {0}', 'node');
}
