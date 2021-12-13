import type { MLMarkupLanguageParser } from '@markuplint/ml-ast';
import type { Config, RuleConfigValue } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import { parse } from '@markuplint/html-parser';

import { convertRuleset } from '../convert-ruleset';
import { Document } from '../ml-dom';

export type CreateTestOptions = {
	config?: Config;
	parser?: MLMarkupLanguageParser;
};

export function createTestDocument<T extends RuleConfigValue = any, O = any>(
	sourceCode: string,
	options?: CreateTestOptions,
) {
	const ast = options?.parser ? options.parser.parse(sourceCode) : parse(sourceCode);
	const ruleset = convertRuleset(options?.config);
	const document = new Document<T, O>(ast, ruleset, [{} as any, {}]);
	return document;
}

export function createTestNodeList(sourceCode: string, options?: CreateTestOptions) {
	const document = createTestDocument(sourceCode, options);
	return document.nodeList;
}

export function createTestElement(sourceCode: string, options?: CreateTestOptions) {
	const document = createTestDocument(sourceCode, options);
	const el = document.nodeList[0];
	if (el.type === 'Element') {
		return el;
	}
	throw TypeError(`Could not parse it to be an element from: ${sourceCode}`);
}

/**
 * for test suite
 */
export function dummySchemas() {
	// @ts-ignore
	return [{}, {}] as [MLMLSpec, ...ExtendedSpec[]];
}
