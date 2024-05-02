import type { ChildNode, Options, TagRule } from './types.js';
import type { Translator } from '@markuplint/i18n';

import { createRule } from '@markuplint/ml-core';

import { contentModel } from './content-model.js';
import meta from './meta.js';
import { transparentMode } from './represent-transparent-nodes.js';

export default createRule<TagRule[], Options>({
	meta: meta,
	defaultValue: [],
	defaultOptions: {
		ignoreHasMutableChildren: true,
		evaluateConditionalChildNodes: false,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (
				!el.rule.options.evaluateConditionalChildNodes &&
				el.rule.options.ignoreHasMutableChildren &&
				el.hasMutableChildren()
			) {
				return;
			}

			const results = contentModel(el, el.rule.value, el.rule.options);
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
						message =
							message ||
							t('Require {0}', t('one or more elements')) + t('. ') + '(' + t('Need "{0*}"', query) + ')';

						report({
							scope,
							message,
						});
						break;
					}
					case 'MISSING_NODE_REQUIRED': {
						message =
							message ||
							t('Require {0}', t('an {0}', 'element')) + t('. ') + '(' + t('Need "{0*}"', query) + ')';

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
										name(not, t),
										name(el, t),
									)
								: t('{0} is not allowed in {1} in this context', name(not, t), name(el, t)));

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
								name(tp, t),
								t('a {0}', 'transparent model'),
								t('also disallows {0} in this context', name(not, t)),
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

			transparentMode.clear();
		});
	},
});

function name(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	scope: ChildNode,
	t: Translator,
) {
	if (scope.is(scope.ELEMENT_NODE)) {
		return t('the "{0}" {1}', scope.localName, 'element');
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
