import type { Config, RuleConfigValue } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import { parse } from '@markuplint/html-parser';

import { convertRuleset } from '../convert-ruleset';
import { Document } from '../ml-dom';

export function createTestDocument<T extends RuleConfigValue = any, O = any>(sourceCode: string, config: Config = {}) {
	const ast = parse(sourceCode);
	const ruleset = convertRuleset(config);
	const document = new Document<T, O>(ast, ruleset, [{} as any, {}]);
	return document;
}

export function createTestNodeList(sourceCode: string) {
	const document = createTestDocument(sourceCode);
	return document.nodeList;
}

export function createTestElement(sourceCode: `<${Alphabet}${string}>`) {
	const document = createTestDocument(sourceCode);
	const el = document.nodeList[0];
	if (el.type === 'Element') {
		return el;
	}
	throw TypeError(`Could not parse it to be an element from: ${sourceCode}`);
}

type Alphabet =
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z';

/**
 * for test suite
 */
export function dummySchemas() {
	// @ts-ignore
	return [{}, {}] as [MLMLSpec, ...ExtendedSpec[]];
}
