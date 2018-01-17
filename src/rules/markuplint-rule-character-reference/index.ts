import {
	CustomRule,
	RuleLevel,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';
import messages from '../messages';

import findLocation from '../../util/findLocation';

export type Value = boolean;

const defaultChars = [
	'"',
	'&',
	'<',
	'>',
];

export default CustomRule.create<Value, null>({
	name: 'character-reference',
	defaultLevel: 'warning',
	defaultValue: true,
	defaultOptions: null,
	async verify (document, locale) {
		const reports: VerifyReturn[] = [];
		const targetNodes: { level: RuleLevel; line: number; col: number; raw: string; message: string }[] = [];

		await document.walkOn('Text', async (node) => {
			if (!node.rule) {
				return;
			}
			const ms = node.rule.level === 'error' ? 'must' : 'should';
			const message = await messages(locale, `{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			targetNodes.push({
				level: node.rule.level,
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
			const level = node.rule.level;
			const ms = level === 'error' ? 'must' : 'should';
			const message = await messages(locale, `{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			targetNodes.push(...node.attributes.map((attr) => {
				return {
					level,
					line: attr.location.line,
					col: attr.location.col + attr.name.length + (attr.equal || '').length + 1,
					raw: attr.value || '',
					message,
				};
			}));
		});

		for (const targetNode of targetNodes) {
			const escapedText = targetNode.raw.replace(/&(?:[a-z]+|#[0-9]+|x[0-9]);/ig, ($0) => '*'.repeat($0.length));
			findLocation(defaultChars, escapedText, targetNode.line, targetNode.col).forEach((foundLocation) => {
				reports.push({
					level: targetNode.level,
					message: targetNode.message,
					line: foundLocation.line,
					col: foundLocation.col,
					raw: foundLocation.raw,
				});
			});
		}
		return reports;
	},
});
