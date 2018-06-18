import CustomRule from '../../rule/custom-rule';

import { Severity, VerifyReturn } from '../../rule';

export type Value = boolean;

const defaultChars = ['"', '&', '<', '>'];

export default CustomRule.create<Value, null>({
	name: 'character-reference',
	defaultValue: true,
	defaultOptions: null,
	async verify(document, messages) {
		const reports: VerifyReturn[] = [];
		const targetNodes: {
			severity: Severity;
			line: number;
			col: number;
			raw: string;
			message: string;
		}[] = [];

		await document.walkOn('Text', async node => {
			const ms = node.rule.severity === 'error' ? 'must' : 'should';
			const message = messages(
				`{0} ${ms} {1}`,
				'Illegal characters',
				'escape in character reference',
			);
			targetNodes.push({
				severity: node.rule.severity,
				line: node.line,
				col: node.col,
				raw: node.raw,
				message,
			});
		});

		await document.walkOn('Element', async node => {
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = messages(
				`{0} ${ms} {1}`,
				'Illegal characters',
				'escape in character reference',
			);
			for (const attr of node.attributes) {
				if (!attr.value) {
					continue;
				}
				targetNodes.push({
					severity,
					line: attr.value.line,
					col: attr.value.col + (attr.value.quote ? 1 : 0),
					raw: attr.value.value,
					message,
				});
			}
		});

		for (const targetNode of targetNodes) {
			const escapedText = targetNode.raw.replace(
				/&(?:[a-z]+|#[0-9]+|x[0-9]);/gi,
				$0 => '*'.repeat($0.length),
			);
			CustomRule.charLocator(
				defaultChars,
				escapedText,
				targetNode.line,
				targetNode.col,
			).forEach(location => {
				reports.push({
					severity: targetNode.severity,
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
