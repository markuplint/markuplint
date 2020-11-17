import { Document, Element, convertRuleset } from '@markuplint/ml-core';
import { parse } from '@markuplint/html-parser';

export function createElement(htmlFragmentString: string) {
	const ast = parse(htmlFragmentString.trim());
	const ruleset = convertRuleset({});
	const document = new Document(ast, ruleset, dummySchemas());
	const el = document.nodeList[0];
	if (el instanceof Element) {
		return el;
	}
	return null;
}

function dummySchemas() {
	// @ts-ignore
	return [{}, {}] as [MLMLSpec, ...ExtendedSpec[]];
}
