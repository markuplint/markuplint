import { ElementVerifyWalkerFactory, VerifyWalkerFactory } from '../types';
import { Result, Text, createRule, getLocationFromChars } from '@markuplint/ml-core';

export type Value = boolean;

const defaultChars = ['"', '&', '<', '>'];
const ignoreParentElement = ['script', 'style'];

const textVerifyWalker: VerifyWalkerFactory<Value, null, Text<Value>> = (reports, translate) => node => {
	if (node.parentNode && ignoreParentElement.includes(node.parentNode.nodeName.toLowerCase())) {
		return;
	}
	const severity = node.rule.severity;
	const ms = severity === 'error' ? 'must' : 'should';
	const message = translate(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
	reports.push({
		severity,
		line: node.startLine,
		col: node.startCol,
		raw: node.raw,
		message,
	});
};

const elementVerifyWalker: ElementVerifyWalkerFactory<Value> = (reports, translate) => node => {
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
		reports.push({
			severity,
			line: value.line,
			col: value.col,
			raw: value.raw,
			message,
		});
	}
};

const normalizeNodesLocation = (targetNodes: Result[]) => {
	const reports: Result[] = [];
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
};

export default createRule<Value>({
	name: 'character-reference',
	defaultValue: true,
	defaultOptions: null,
	async verify(document, translate) {
		const targetNodes: Result[] = [];

		await document.walkOn('Text', textVerifyWalker(targetNodes, translate));
		await document.walkOn('Element', elementVerifyWalker(targetNodes, translate));

		return normalizeNodesLocation(targetNodes);
	},
	verifySync(document, translate) {
		const targetNodes: Result[] = [];

		document.walkOnSync('Text', textVerifyWalker(targetNodes, translate));
		document.walkOnSync('Element', elementVerifyWalker(targetNodes, translate));

		return normalizeNodesLocation(targetNodes);
	},
});
