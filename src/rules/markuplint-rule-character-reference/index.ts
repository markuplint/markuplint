import CustomRule from '../../rule/custom-rule';

import {
	Severity,
	VerifyReturn } from '../../rule';

export type Value = boolean;

const defaultChars = [
	'"',
	'&',
	'<',
	'>',
];

export default CustomRule.create<Value, null>({
	name: 'character-reference',
	defaultValue: true,
	defaultOptions: null,
	async verify (document, messages) {
		const reports: VerifyReturn[] = [];
		const targetNodes: { level: Severity; line: number; col: number; raw: string; message: string }[] = [];

		await document.walkOn('Text', async (node) => {
			if (!node.rule) {
				return;
			}
			const ms = node.rule.severity === 'error' ? 'must' : 'should';
			const message = messages(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			targetNodes.push({
				level: node.rule.severity,
				line: node.line,
				col: node.col,
				raw: node.raw,
				message,
			});
		});

		await document.walkOn('Element', async (node) => {
			if (!node.rule) {
				return;
			}
			const level = node.rule.severity;
			const ms = level === 'error' ? 'must' : 'should';
			const message = messages(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			targetNodes.push(...node.attributes.map((attr) => {
				return {
					level,
					line: attr.location.line,
					col: attr.location.col,
					raw: attr.value ? attr.value.raw : '',
					message,
				};
			}));
		});

		for (const targetNode of targetNodes) {
			const escapedText = targetNode.raw.replace(/&(?:[a-z]+|#[0-9]+|x[0-9]);/ig, ($0) => '*'.repeat($0.length));
			CustomRule.charLocator(defaultChars, escapedText, targetNode.line, targetNode.col).forEach((location) => {
				reports.push({
					severity: targetNode.level,
					message: targetNode.message,
					line: location.line,
					col: location.col,
					raw: location.raw,
				});
			});
		}
		return reports;
	},
});
