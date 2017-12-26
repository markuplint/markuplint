import {
	Document,
	Element,
	TextNode,
} from '../../parser';
import Rule, {
	RuleConfig,
	VerifyReturn,
} from '../../rule';
import Ruleset from '../../ruleset';
import findLocation from '../../util/findLocation';
import messages from '../messages';

export type Value = boolean;

export interface Options {}

const defaultChars = [
	'"',
	'&',
	'<',
	'>',
];

export default class extends Rule<Value, Options> {
	public name = 'character-reference';

	public async verify (document: Document, config: RuleConfig<Value, Options>, ruleset: Ruleset, locale: string) {
		const reports: VerifyReturn[] = [];
		const ms = config.level === 'error' ? 'must' : 'should';
		const message = await messages(locale, `{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
		const targetNodes: { line: number; col: number; raw: string }[] = [];

		await document.walkOn('Text', async (node) => {
			targetNodes.push({
				line: node.line,
				col: node.col,
				raw: node.raw,
			});
		});

		await document.walkOn('Element', async (node) => {
			targetNodes.push(...node.attributes.map((attr) => {
				return {
					line: attr.location.line,
					col: attr.location.col + attr.name.length + (attr.equal || '').length + 1,
					raw: attr.value || '',
				};
			}));
		});

		for (const targetNode of targetNodes) {
			const escapedText = targetNode.raw.replace(/&(?:[a-z]+|#[0-9]+|x[0-9]);/ig, ($0) => '*'.repeat($0.length));
			findLocation(defaultChars, escapedText, targetNode.line, targetNode.col).forEach((foundLocation) => {
				reports.push({
					level: config.level,
					message,
					line: foundLocation.line,
					col: foundLocation.col,
					raw: foundLocation.raw,
				});
			});
		}
		return reports;
	}
}
