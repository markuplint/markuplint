import { Document, Element, Result, RuleInfo, createRule } from '@markuplint/ml-core';
import { Translator } from '@markuplint/i18n';

export type Value = boolean;

export interface RequiredH1Options {
	'expected-once': boolean;
	'in-document-fragment': boolean;
}

const preCheck = (document: Document<Value, RequiredH1Options>, globalRule: RuleInfo<Value, RequiredH1Options>) => {
	if (document.nodeList.length === 0) {
		return true;
	}

	if (!globalRule.option['in-document-fragment'] && document.isFragment) {
		return true;
	}
};

const verifyWalker = (h1Stack: Element<Value, RequiredH1Options>[]) => (node: Element<boolean, RequiredH1Options>) => {
	if (node.nodeName.toLowerCase() === 'h1') {
		h1Stack.push(node);
	}
};

const normalizeH1Reports = (
	document: Document<Value, RequiredH1Options>,
	translate: Translator,
	globalRule: RuleInfo<Value, RequiredH1Options>,
	h1Stack: Element<Value, RequiredH1Options>[],
) => {
	const reports: Result[] = [];
	if (h1Stack.length === 0) {
		const message = translate('Missing the {0} {1}', 'h1', 'element');
		reports.push({
			severity: globalRule.severity,
			message,
			line: 1,
			col: 1,
			raw: document.nodeList[0].raw.slice(0, 1),
		});
	} else if (globalRule.option['expected-once'] && h1Stack.length > 1) {
		const message = translate('Duplicate the {0} {1}', 'h1', 'element');
		reports.push({
			severity: globalRule.severity,
			message,
			line: h1Stack[1].startLine,
			col: h1Stack[1].startCol,
			raw: h1Stack[1].raw,
		});
	}
	return reports;
};

export default createRule<Value, RequiredH1Options>({
	name: 'required-h1',
	defaultValue: true,
	defaultOptions: {
		'expected-once': true,
		'in-document-fragment': false,
	},
	async verify(document, translate, globalRule) {
		if (preCheck(document, globalRule)) {
			return [];
		}

		const h1Stack: Element<Value, RequiredH1Options>[] = [];
		await document.walkOn('Element', verifyWalker(h1Stack));
		return normalizeH1Reports(document, translate, globalRule, h1Stack);
	},
	verifySync(document, translate, globalRule) {
		if (preCheck(document, globalRule)) {
			return [];
		}

		const h1Stack: Element<Value, RequiredH1Options>[] = [];
		document.walkOnSync('Element', verifyWalker(h1Stack));
		return normalizeH1Reports(document, translate, globalRule, h1Stack);
	},
});
