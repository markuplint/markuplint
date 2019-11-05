import { Element, Result, createRule } from '@markuplint/ml-core';
import { PermittedContent, PermittedStructuresSchema } from '@markuplint/ml-spec';
import htmlSpec from './html-spec';
import specToRegExp from './permitted-content.spec-to-regexp';
import unfoldContentModelsToTags from './unfold-content-models-to-tags';

type TagRule = PermittedStructuresSchema;

export default createRule<boolean, TagRule[]>({
	name: 'permitted-contents',
	defaultValue: true,
	defaultOptions: [],
	async verify(document, messages) {
		const reports: Result[] = [];
		await document.walkOn('Element', async node => {
			if (!node.rule.value) {
				return;
			}

			const nodes = node.getChildElementsAndTextNodeWithoutWhitespaces();
			const spec = htmlSpec(node.nodeName);

			if (spec) {
				let matched = false;
				if (spec.conditional) {
					for (const conditional of spec.conditional) {
						matched =
							('hasAttr' in conditional.condition && node.hasAttribute(conditional.condition.hasAttr)) ||
							('parent' in conditional.condition &&
								!!node.parentNode &&
								node.parentNode.type === 'Element' &&
								node.parentNode.matches(conditional.condition.parent));
						if (matched) {
							const conditionalResult = match(conditional.contents, nodes);
							if (!conditionalResult) {
								reports.push({
									severity: node.rule.severity,
									message: messages(`Invalid content in "${node.nodeName}" element on the HTML spec`),
									line: node.startLine,
									col: node.startCol,
									raw: node.raw,
								});
								break;
							}
						}
					}
				}

				if (!matched) {
					const specResult = match(spec.contents, nodes);

					if (!specResult) {
						reports.push({
							severity: node.rule.severity,
							message: messages(`Invalid content in "${node.nodeName}" element on the HTML spec`),
							line: node.startLine,
							col: node.startCol,
							raw: node.raw,
						});
					}
				}
			}

			for (const rule of node.rule.option) {
				if (rule.tag.toLowerCase() !== node.nodeName.toLowerCase()) {
					continue;
				}

				const r = match(rule.contents, nodes);

				if (!r) {
					reports.push({
						severity: node.rule.severity,
						message: messages(`Invalid content in "${node.nodeName}" element on rule settings`),
						line: node.startLine,
						col: node.startCol,
						raw: node.raw,
					});
					return;
				}
			}
		});
		return reports;
	},
});

type TargetNodes = ReturnType<Element<boolean, TagRule[]>['getChildElementsAndTextNodeWithoutWhitespaces']>;

function normalization(nodes: TargetNodes) {
	return nodes.map(node => `<${node.type === 'Element' ? node.nodeName : '#text'}>`).join('');
}

function match(contentRule: PermittedContent[] | boolean, nodes: TargetNodes) {
	if (contentRule === true) {
		return true;
	} else if (contentRule === false) {
		return !nodes.length;
	}
	const exp = specToRegExp(contentRule);
	const target = normalization(nodes);
	const result = exp.exec(target);
	const capGroups = result && result.groups;
	// console.log({ exp, target, capGroups });
	if (capGroups) {
		for (const groupName of Object.keys(capGroups)) {
			const matched = capGroups[groupName];
			const targetsMaybeIncludesNotAllowedDescendants = matched.split(/><|<|>/g).filter(_ => _);
			const [type, ..._contents] = groupName.split(/(?<=[a-z0-9])_/gi);
			const contents: Set<string> = new Set();
			_contents.forEach(content => {
				if (content[0] === '_') {
					unfoldContentModelsToTags(content.replace('_', '#')).forEach(tag => contents.add(tag));
					return;
				}
				contents.add(content);
			});
			const selectors = Array.from(contents);
			// console.log({ groupName, matched, _contents, type, selectors, targetsMaybeIncludesNotAllowedDescendants });
			switch (type) {
				case 'NAD': {
					for (const node of nodes) {
						for (const target of targetsMaybeIncludesNotAllowedDescendants) {
							if (node.type === 'Text') {
								if (target === '#text') {
									return false;
								}
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
	return !!result;
}
