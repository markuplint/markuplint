import { Result, createRule, getLocationFromChars } from '@markuplint/ml-core';

export type Value = boolean;

const defaultChars = ['"', '&', '<', '>'];
const ignoreParentElement = ['script', 'style'];

export default createRule<Value>({
	name: 'character-reference',
	defaultValue: true,
	defaultOptions: null,
	verify(document, translate) {
		const reports: Result[] = [];
		const targetNodes: Result[] = [];

		document.walkOn('Text', node => {
			if (node.parentNode && ignoreParentElement.includes(node.parentNode.nodeName.toLowerCase())) {
				return;
			}
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = translate(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			targetNodes.push({
				severity,
				line: node.startLine,
				col: node.startCol,
				raw: node.raw,
				message,
			});
		});

		document.walkOn('Element', node => {
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = translate(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			for (const attr of node.attributes) {
				if (
					attr.attrType === 'ps-attr' ||
					(attr.attrType === 'html-attr' && attr.isDynamicValue) ||
					(attr.attrType === 'html-attr' && attr.isDirective)
				) {
					continue;
				}
				const value = attr.getValue();
				targetNodes.push({
					severity,
					line: value.line,
					col: value.col,
					raw: value.raw,
					message,
				});
			}
		});

		for (const targetNode of targetNodes) {
			const escapedText = targetNode.raw.replace(/&(?:[a-z]+|#[0-9]+|x[0-9]);/gi, $0 => '*'.repeat($0.length));
			getLocationFromChars(defaultChars, escapedText, targetNode.line, targetNode.col).forEach(location => {
				reports.push({
					severity: targetNode.severity,
					message: targetNode.message,
					...location,
				});
			});
		}

		return reports;
	},
});
