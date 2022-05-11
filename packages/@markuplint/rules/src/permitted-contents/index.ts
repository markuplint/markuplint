import type { Element } from '@markuplint/ml-core';
import type { ContentModel, MLMLSpec, PermittedStructuresSchema } from '@markuplint/ml-spec';

import { createRule } from '@markuplint/ml-core';

import { htmlSpec } from '../helpers';

import ExpGenerator from './permitted-content.spec-to-regexp';
import unfoldContentModelsToTags from './unfold-content-models-to-tags';

type TagRule = PermittedStructuresSchema;
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
		await document.walkOn('Element', async el => {
			if (!el.rule.value) {
				return;
			}

			if (el.rule.option.ignoreHasMutableChildren && el.hasMutableChildren()) {
				return;
			}

			const specType = el.ns === 'html' ? 'HTML' : el.ns === 'svg' ? 'SVG' : 'Any Language';

			const childNodes = el.getChildElementsAndTextNodeWithoutWhitespaces();
			const spec = !el.isCustomElement && htmlSpec(document.specs, el.nameWithNS)?.permittedStructures;

			const expGen = new ExpGenerator(idCounter++);

			if (spec) {
				if (spec.ancestor && !el.closest(spec.ancestor)) {
					report({
						scope: el,
						message: t(
							'{0} must be {1}',
							t('the "{0*}" {1}', el.localName, 'element'),
							t('{0} of {1}', 'descendant', t('the "{0*}" {1}', spec.ancestor, 'element')),
						),
					});
					return;
				}

				let matched = false;

				if (spec.conditional) {
					for (const conditional of spec.conditional) {
						matched =
							('hasAttr' in conditional.condition && el.hasAttribute(conditional.condition.hasAttr)) ||
							('parent' in conditional.condition &&
								!!el.parentElement &&
								el.parentElement.matches(conditional.condition.parent));
						// console.log({ ...conditional, matched });
						if (matched) {
							try {
								const parentExp = getRegExpFromParentNode(document.specs, el, expGen);
								const exp = expGen.specToRegExp(conditional.contents, parentExp, el.ns);
								const conditionalResult = match(exp, childNodes, el.ns, false);
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
						const specResult = match(exp, childNodes, el.ns, false);

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
					const exp = expGen.specToRegExp(rule.contents, parentExp, el.ns);
					// Evaluate the custom element if the optional schema.
					const r = match(exp, childNodes, el.ns, el.isCustomElement);

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

function normalization(nodes: TargetNodes, ownNS: string | null, evalCustomElement: boolean) {
	return nodes
		.map(node => {
			// FIXME: https://github.com/markuplint/markuplint/issues/388
			if (!evalCustomElement && node.is(node.ELEMENT_NODE) && node.isCustomElement) {
				return '';
			}
			if (!node.is(node.ELEMENT_NODE)) {
				return '<#text>';
			}
			ownNS = ownNS || 'html';
			const name = node.nameWithNS.replace(new RegExp(`^${ownNS}:`), '');
			return `<${name}>`;
		})
		.join('');
}

type El = {
	uuid: string;
	nodeName: string;
	parentNode: El | null;
	isCustomElement?: boolean;
	nameWithNS?: string;
	ns?: string | null;
};

function getRegExpFromNode(specs: Readonly<MLMLSpec>, node: El, expGen: ExpGenerator) {
	// console.log({ n: node.nodeName });
	if (expMapOnNodeId.has(node.uuid)) {
		return expMapOnNodeId.get(node.uuid)!;
	}
	const parentExp = node.parentNode ? getRegExpFromNode(specs, node.parentNode, expGen) : null;
	const spec =
		!node.isCustomElement && htmlSpec(specs, node.nameWithNS || node.nodeName.toLowerCase())?.permittedStructures;
	const contentRule = spec ? spec.contents : true;
	const exp = expGen.specToRegExp(contentRule, parentExp, node.ns || null);
	expMapOnNodeId.set(node.uuid, exp);
	return exp;
}

function getRegExpFromParentNode(specs: Readonly<MLMLSpec>, node: El, expGen: ExpGenerator) {
	// console.log({ p: node.nodeName });
	const parentExp = node.parentNode ? getRegExpFromNode(specs, node.parentNode, expGen) : null;
	return parentExp;
}

const matchingCacheMap = new Map<string, boolean>();

function match(exp: RegExp, childNodes: TargetNodes, ownNS: string | null, evalCustomElement: boolean) {
	const target = normalization(childNodes, ownNS, evalCustomElement);
	const cacheKey =
		target +
		exp.source +
		childNodes.map(n => (n.is(n.ELEMENT_NODE) ? n.toNormalizeString() : n.originRaw)).join('');
	const res = matchingCacheMap.get(cacheKey);

	if (res != null) {
		return res;
	}

	const matched = _match(target, exp, childNodes);

	matchingCacheMap.set(cacheKey, matched);
	return matched;
}

function _match(target: string, exp: RegExp, childNodes: TargetNodes) {
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
				const selectors = unfoldContentModelsToTags(`#${model}` as ContentModel).filter(selector => {
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
						unfoldContentModelsToTags(content.replace('_', '#') as ContentModel).forEach(tag =>
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
