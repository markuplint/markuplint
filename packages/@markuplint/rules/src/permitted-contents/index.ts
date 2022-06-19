import type { Element, Document, DocumentFragment } from '@markuplint/ml-core';
import type { Category, MLMLSpec, ContentModel } from '@markuplint/ml-spec';

import { createRule, getSpec, resolveNamespace } from '@markuplint/ml-core';
import { contentModelCategoryToTagNames } from '@markuplint/ml-spec';

import ExpGenerator from './permitted-content.spec-to-regexp';

type TagRule = ContentModel & { tag: string };
type Options = {
	ignoreHasMutableChildren: boolean;
};

const expMapOnNodeId: Map<string, RegExp> = new Map();

export default createRule<TagRule[], Options>({
	defaultValue: [],
	defaultOptions: {
		ignoreHasMutableChildren: true,
	},
	async verify({ document, report, t }) {
		let idCounter = 0;
		await document.walkOn('Element', el => {
			if (!el.rule.value) {
				return;
			}

			if (el.rule.option.ignoreHasMutableChildren && el.hasMutableChildren()) {
				return;
			}

			const specType =
				el.namespaceURI === 'http://www.w3.org/1999/xhtml'
					? 'HTML'
					: el.namespaceURI === 'http://www.w3.org/2000/svg'
					? 'SVG'
					: 'Any Language';

			const childNodes = el.getChildElementsAndTextNodeWithoutWhitespaces();
			const spec = !el.isCustomElement && getSpec(el, document.specs)?.contentModel;

			const expGen = new ExpGenerator(document.specs, idCounter++);

			if (spec) {
				if (spec.descendantOf && !el.closest(spec.descendantOf)) {
					report({
						scope: el,
						message: t(
							'{0} must be {1}',
							t('the "{0*}" {1}', el.localName, 'element'),
							t('{0} of {1}', 'descendant', t('the "{0*}" {1}', spec.descendantOf, 'element')),
						),
					});
					return;
				}

				let matched = false;

				if (spec.conditional) {
					for (const conditional of spec.conditional) {
						matched = el.matches(conditional.condition);
						// console.log({ ...conditional, matched });
						if (matched) {
							try {
								const parentExp = getRegExpFromParentNode(document.specs, el, expGen);
								const exp = expGen.specToRegExp(conditional.contents, parentExp, el.namespaceURI);
								const conditionalResult = match(exp, childNodes, false, document.specs);
								if (!conditionalResult) {
									const message = t(
										'{0} is {1:c}',
										t(
											'{0} of {1}',
											t('the {0}', 'content'),
											t('the "{0*}" {1}', el.localName, 'element'),
										),
										'invalid',
									);
									report({
										scope: el,
										message:
											specType !== 'Any Language'
												? t('{0} according to {1}', message, `the ${specType} specification`)
												: message,
										line: el.startLine,
										col: el.startCol,
										raw: el.raw,
									});
									break;
								}
							} catch (e) {
								if (e instanceof Error) {
									// eslint-disable-next-line no-console
									console.warn(el.raw, 'conditional', conditional, e.message);
								} else {
									throw e;
								}
							}
						}
					}
				}

				if (!matched) {
					try {
						const exp = getRegExpFromNode(document.specs, el, expGen);
						const specResult = match(exp, childNodes, false, document.specs);

						if (!specResult) {
							const message = t(
								'{0} is {1:c}',
								t('{0} of {1}', t('the {0}', 'content'), t('the "{0*}" {1}', el.localName, 'element')),
								'invalid',
							);
							report({
								scope: el,
								message:
									specType !== 'Any Language'
										? t('{0} according to {1}', message, `the ${specType} specification`)
										: message,
							});
						}
					} catch (e) {
						if (e instanceof Error) {
							// eslint-disable-next-line no-console
							console.warn(el.raw, 'HTML Spec', e.message);
						} else {
							throw e;
						}
					}
				}
			}

			for (const rule of el.rule.value) {
				if (rule.tag.toLowerCase() !== el.localName.toLowerCase()) {
					continue;
				}

				const parentExp = getRegExpFromParentNode(document.specs, el, expGen);
				try {
					const exp = expGen.specToRegExp(rule.contents, parentExp, el.namespaceURI);
					// Evaluate the custom element if the optional schema.
					const r = match(exp, childNodes, el.isCustomElement, document.specs);

					if (!r) {
						report({
							scope: el,
							message: t(
								'{0} is {1:c}',
								t('{0} of {1}', t('the {0}', 'content'), t('the "{0*}" {1}', el.localName, 'element')),
								'invalid',
							),
							line: el.startLine,
							col: el.startCol,
							raw: el.raw,
						});
						return;
					}
				} catch (e) {
					if (e instanceof Error) {
						// eslint-disable-next-line no-console
						console.warn(el.raw, 'rule', rule, e.message);
					} else {
						throw e;
					}
				}
			}
		});

		expMapOnNodeId.clear();
	},
});

type TargetNodes = ReturnType<Element<TagRule[], Options>['getChildElementsAndTextNodeWithoutWhitespaces']>;

function normalization(el: TargetNodes, evalCustomElement: boolean) {
	return el
		.map(node => {
			// FIXME: https://github.com/markuplint/markuplint/issues/388
			if (!evalCustomElement && node.is(node.ELEMENT_NODE) && node.isCustomElement) {
				return '';
			}
			if (!node.is(node.ELEMENT_NODE)) {
				return '<#text>';
			}
			const { localNameWithNS } = resolveNamespace(node.localName, node.namespaceURI);
			return `<${localNameWithNS}>`;
		})
		.join('');
}

function getRegExpFromNode(
	specs: Readonly<MLMLSpec>,
	el: Element<any, any> | Document<any, any> | DocumentFragment<any, any>,
	expGen: ExpGenerator,
) {
	// console.log({ n: node.nodeName });
	if (expMapOnNodeId.has(el.uuid)) {
		return expMapOnNodeId.get(el.uuid)!;
	}
	const parentExp = el.parentNode ? getRegExpFromNode(specs, el.parentNode, expGen) : null;
	const spec = el.nodeType === el.ELEMENT_NODE && !el.isCustomElement && getSpec(el, specs)?.contentModel;
	const contentRule = spec ? spec.contents : true;
	const exp = expGen.specToRegExp(
		contentRule,
		parentExp,
		el.nodeType === el.ELEMENT_NODE ? el.namespaceURI : undefined,
	);
	expMapOnNodeId.set(el.uuid, exp);
	return exp;
}

function getRegExpFromParentNode(specs: Readonly<MLMLSpec>, el: Element<any, any>, expGen: ExpGenerator) {
	// console.log({ p: node.nodeName });
	const parentExp = el.parentNode ? getRegExpFromNode(specs, el.parentNode, expGen) : null;
	return parentExp;
}

const matchingCacheMap = new Map<string, boolean>();

function match(exp: RegExp, childNodes: TargetNodes, evalCustomElement: boolean, specs: MLMLSpec) {
	const target = normalization(childNodes, evalCustomElement);
	const cacheKey =
		target +
		exp.source +
		childNodes.map(n => (n.is(n.ELEMENT_NODE) ? n.toNormalizeString() : n.originRaw)).join('');
	const res = matchingCacheMap.get(cacheKey);

	if (res != null) {
		return res;
	}

	const matched = _match(target, exp, childNodes, specs);

	matchingCacheMap.set(cacheKey, matched);
	return matched;
}

function _match(target: string, exp: RegExp, childNodes: TargetNodes, specs: MLMLSpec) {
	const result = exp.exec(target);
	if (!result) {
		return false;
	}
	const capGroups = result.groups;
	// console.log({ exp, target, capGroups });
	if (!capGroups) {
		return true;
	}
	const groupNames = Object.keys(capGroups);
	for (const groupName of groupNames) {
		const matched = capGroups[groupName];
		if (!matched) {
			continue;
		}
		const [type, , ..._selector] = groupName.split(/(?<=[a-z0-9])_/gi);
		// console.log({ type, _selector });
		switch (type) {
			case 'ACM': {
				const [model, tag] = _selector;
				const selectors = contentModelCategoryToTagNames(`#${model}` as Category, specs).filter(selector => {
					const [, tagName] = /^([^[\]]+)(?:\[[^\]]+\])?$/.exec(selector) || [];
					return tagName.toLowerCase() === tag.toLowerCase();
				});
				for (const node of childNodes) {
					if (node.is(node.TEXT_NODE)) {
						continue;
					}
					if (node.nodeName.toLowerCase() !== tag.toLowerCase()) {
						continue;
					}
					for (const selector of selectors) {
						const matched = node.matches(selector);
						// console.log({ raw: node.raw, selector, matched });
						if (matched) {
							return true;
						}
					}
					return false;
				}
				break;
			}
			case 'NAD': {
				let targetsMaybeIncludesNotAllowedDescendants = Array.from(
					new Set(matched.split(/><|<|>/g).filter(_ => _)),
				);
				const contents: Set<string> = new Set();
				const transparentGroupName = groupNames.find(name => /^TRANSPARENT_[0-9]+$/.test(name));
				const inTransparent = _selector.includes('__InTRANSPARENT')
					? transparentGroupName && capGroups[transparentGroupName]
						? capGroups[transparentGroupName].split(/><|<|>/g).filter(_ => _)
						: null
					: null;
				_selector.forEach(content => {
					if (content[0] === '_') {
						contentModelCategoryToTagNames(content.replace('_', '#') as Category, specs).forEach(tag =>
							contents.add(tag),
						);
						return;
					}
					contents.add(content);
				});
				const selectors = Array.from(contents);
				targetsMaybeIncludesNotAllowedDescendants = targetsMaybeIncludesNotAllowedDescendants.filter(content =>
					inTransparent ? inTransparent.includes(content) : true,
				);
				// console.log({
				// 	groupName,
				// 	matched,
				// 	_selector,
				// 	type,
				// 	selectors,
				// 	inTransparent,
				// 	targetsMaybeIncludesNotAllowedDescendants,
				// });
				for (const node of childNodes) {
					for (const target of targetsMaybeIncludesNotAllowedDescendants) {
						if (node.is(node.TEXT_NODE)) {
							if (selectors.includes('#text')) {
								return false;
							}
							continue;
						}
						if (node.nodeName.toLowerCase() !== target.toLowerCase()) {
							continue;
						}
						for (const selector of selectors) {
							// console.log({ selector, target });

							// Self
							if (node.matches(selector)) {
								return false;
							}

							// Descendants
							const nodeList = node.querySelectorAll(selector);
							if (nodeList.length) {
								return false;
							}
						}
					}
				}
				break;
			}
		}
	}
	return true;
}
