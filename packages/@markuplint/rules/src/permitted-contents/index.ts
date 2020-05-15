import { ContentModel, PermittedStructuresSchema } from '@markuplint/ml-spec';
import { Element, Result, createRule } from '@markuplint/ml-core';
import ExpGenerator from './permitted-content.spec-to-regexp';
import htmlSpec from './html-spec';
import unfoldContentModelsToTags from './unfold-content-models-to-tags';

type TagRule = PermittedStructuresSchema;

const expMapOnNodeId: Map<string, RegExp> = new Map();

export default createRule<boolean, TagRule[]>({
	name: 'permitted-contents',
	defaultValue: true,
	defaultOptions: [],
	async verify(document, translate) {
		const reports: Result[] = [];
		let idCounter = 0;
		await document.walkOn('Element', async node => {
			if (!node.rule.value) {
				return;
			}

			const nodes = node.getChildElementsAndTextNodeWithoutWhitespaces();
			const spec = htmlSpec(node.nodeName);

			const expGen = new ExpGenerator(idCounter++);

			if (spec) {
				if (spec.ancestor && !node.closest(spec.ancestor)) {
					reports.push({
						severity: node.rule.severity,
						message: translate(
							'The {0} element must be descendant of the {1} element',
							node.nodeName,
							spec.ancestor,
						),
						line: node.startLine,
						col: node.startCol,
						raw: node.raw,
					});
					return;
				}

				let matched = false;

				if (spec.conditional) {
					for (const conditional of spec.conditional) {
						matched =
							('hasAttr' in conditional.condition && node.hasAttribute(conditional.condition.hasAttr)) ||
							('parent' in conditional.condition &&
								!!node.parentNode &&
								node.parentNode.type === 'Element' &&
								node.parentNode.matches(conditional.condition.parent));
						// console.log({ ...conditional, matched });
						if (matched) {
							try {
								const parentExp = getRegExpFromParentNode(node, expGen);
								const exp = expGen.specToRegExp(conditional.contents, parentExp);
								const conditionalResult = match(exp, nodes);
								if (!conditionalResult) {
									reports.push({
										severity: node.rule.severity,
										message: translate(
											'Invalid content of the {0} element in {1}',
											node.nodeName,
											'the HTML specification',
										),
										line: node.startLine,
										col: node.startCol,
										raw: node.raw,
									});
									break;
								}
							} catch (e) {
								// eslint-disable-next-line no-console
								console.warn(node.raw, 'conditional', conditional, e.message);
							}
						}
					}
				}

				if (!matched) {
					try {
						const exp = getRegExpFromNode(node, expGen);
						const specResult = match(exp, nodes);

						if (!specResult) {
							reports.push({
								severity: node.rule.severity,
								message: translate(
									'Invalid content of the {0} element in {1}',
									node.nodeName,
									'the HTML specification',
								),
								line: node.startLine,
								col: node.startCol,
								raw: node.raw,
							});
						}
					} catch (e) {
						// eslint-disable-next-line no-console
						console.warn(node.raw, 'HTML Spec', e.message);
					}
				}
			}

			for (const rule of node.rule.option) {
				if (rule.tag.toLowerCase() !== node.nodeName.toLowerCase()) {
					continue;
				}

				const parentExp = getRegExpFromParentNode(node, expGen);
				try {
					const exp = expGen.specToRegExp(rule.contents, parentExp);
					const r = match(exp, nodes);

					if (!r) {
						reports.push({
							severity: node.rule.severity,
							message: translate('Invalid content of the {0} element in {1}', node.nodeName, 'settings'),
							line: node.startLine,
							col: node.startCol,
							raw: node.raw,
						});
						return;
					}
				} catch (e) {
					// eslint-disable-next-line no-console
					console.warn(node.raw, 'rule', rule, e.message);
				}
			}
		});

		expMapOnNodeId.clear();
		return reports;
	},
});

type TargetNodes = ReturnType<Element<boolean, TagRule[]>['getChildElementsAndTextNodeWithoutWhitespaces']>;

function normalization(nodes: TargetNodes) {
	return nodes.map(node => `<${node.type === 'Element' ? node.nodeName : '#text'}>`).join('');
}

type El = {
	uuid: string;
	nodeName: string;
	parentNode: El | null;
};

function getRegExpFromNode(node: El, expGen: ExpGenerator) {
	// console.log({ n: node.nodeName });
	if (expMapOnNodeId.has(node.uuid)) {
		return expMapOnNodeId.get(node.uuid)!;
	}
	const parentExp = node.parentNode ? getRegExpFromNode(node.parentNode, expGen) : null;
	const spec = htmlSpec(node.nodeName);
	const contentRule = spec ? spec.contents : true;
	const exp = expGen.specToRegExp(contentRule, parentExp);
	expMapOnNodeId.set(node.uuid, exp);
	return exp;
}

function getRegExpFromParentNode(node: El, expGen: ExpGenerator) {
	// console.log({ p: node.nodeName });
	const parentExp = node.parentNode ? getRegExpFromNode(node.parentNode, expGen) : null;
	return parentExp;
}

function match(exp: RegExp, nodes: TargetNodes) {
	const target = normalization(nodes);
	const result = exp.exec(target);
	if (!result) {
		return false;
	}
	const capGroups = result.groups;
	// console.log({ exp, target, capGroups });
	if (capGroups) {
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
					for (const node of nodes) {
						if (node.type === 'Text') {
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
					targetsMaybeIncludesNotAllowedDescendants = targetsMaybeIncludesNotAllowedDescendants.filter(
						content => (inTransparent ? inTransparent.includes(content) : true),
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
					for (const node of nodes) {
						for (const target of targetsMaybeIncludesNotAllowedDescendants) {
							if (node.type === 'Text') {
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
	}
	return true;
}
