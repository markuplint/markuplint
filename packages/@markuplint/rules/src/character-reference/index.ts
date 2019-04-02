import { Result, createRule, getLocationFromChars } from '@markuplint/ml-core';

export type Value = boolean;

const defaultChars = ['"', '&', '<', '>'];
const ignoreParentElement = ['script', 'style'];

export default createRule<Value>({
	name: 'character-reference',
	defaultValue: true,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: Result[] = [];
		const targetNodes: Result[] = [];

		await document.walkOn('Text', async node => {
			if (node.parentNode && ignoreParentElement.includes(node.parentNode.nodeName.toLowerCase())) {
				return;
			}
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = messages(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			targetNodes.push({
				severity,
				line: node.startLine,
				col: node.startCol,
				raw: node.raw,
				message,
			});
		});

		await document.walkOn('Element', async node => {
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = messages(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			for (const attr of node.attributes) {
				if (!attr.value) {
					continue;
				}
				targetNodes.push({
					severity,
					line: attr.value.startLine,
					col: attr.value.startCol,
					raw: attr.value.raw,
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
