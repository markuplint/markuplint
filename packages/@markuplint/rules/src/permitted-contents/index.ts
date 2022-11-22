import type { ChildNode, Options, TagRule } from './types';
import type { Translator } from '@markuplint/i18n';

import { createRule } from '@markuplint/ml-core';

import { contentModel } from './content-model';
import { transparentMode } from './represent-transparent-nodes';

export default createRule<TagRule[], Options>({
	defaultValue: [],
	defaultOptions: {
		ignoreHasMutableChildren: true,
	},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (!el.rule.value) {
				return;
			}

			if (el.rule.option.ignoreHasMutableChildren && el.hasMutableChildren()) {
				return;
			}

			const results = contentModel(el, el.rule.value, el.rule.option);
			for (const { type, scope, query, hint } of results) {
				let message = '';

				if (hint) {
					if (hint.max != null) {
						message =
							t('there is more content than it needs') +
							t('. ') +
							t('the max number of elements required is {0}', `${hint.max}`);
					}
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
					case 'VOID_ELEMENT': {
						report({
							scope: el,
							message: t('{0} is {1}', t('the {0}', 'element'), t('a {0}', 'void element')),
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

function name(scope: ChildNode, t: Translator) {
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
