import { createRule, getLocationFromChars } from '@markuplint/ml-core';

const defaultChars = ['"', '&', '<', '>'];
const ignoreParentElement = ['script', 'style'];

export default createRule({
	async verify({ document, report, t }) {
		const targetNodes: Parameters<typeof report>[0][] = [];

		await document.walkOn('Text', node => {
			if (node.parentNode && ignoreParentElement.includes(node.parentNode.nodeName.toLowerCase())) {
				return;
			}
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = t(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			targetNodes.push({
				scope: node,
				line: node.startLine,
				col: node.startCol,
				raw: node.raw,
				message,
			});
		});

		await document.walkOn('Element', node => {
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = t(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			for (const attr of node.attributes) {
				if (attr.isDynamicValue || attr.isDirective) {
					continue;
				}
				const valueNode = attr.valueNode;
				targetNodes.push({
					scope: node,
					line: valueNode?.startLine,
					col: valueNode?.startCol,
					raw: valueNode?.raw,
					message,
				});
			}
		});

		for (const targetNode of targetNodes) {
			if (!('scope' in targetNode && 'line' in targetNode)) {
				continue;
			}
			const escapedText = targetNode.raw.replace(/&(?:[a-z]+|#[0-9]+|x[0-9]);/gi, $0 => '*'.repeat($0.length));
			getLocationFromChars(defaultChars, escapedText, targetNode.line, targetNode.col).forEach(location => {
				report({
					scope: targetNode.scope,
					message: targetNode.message,
					...location,
				});
			});
		}
	},
});
