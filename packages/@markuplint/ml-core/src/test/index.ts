import type { MLElement } from '../ml-dom/node/element.js';
import type { MLNode } from '../ml-dom/node/node.js';
import type { MLToken } from '../ml-dom/token/token.js';
import type { MLASTNode, MLASTToken, MLParser } from '@markuplint/ml-ast';
import type { Config, PlainData, Pretender, RuleConfigValue } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';

import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';

import { convertRuleset } from '../convert-ruleset.js';
import { MLDocument } from '../ml-dom/node/document.js';

export type CreateTestOptions = {
	readonly config?: Config;
	readonly parser?: { readonly parser: Readonly<MLParser> } | Readonly<MLParser>;
	readonly specs?: MLMLSpec;
	readonly pretenders?: readonly Pretender[];
};

export function createTestDocument<T extends RuleConfigValue = any, O extends PlainData = any>(
	sourceCode: string,
	options?: CreateTestOptions,
): MLDocument<T, O> {
	const ast = options?.parser
		? 'parser' in options.parser
			? options.parser.parser.parse(sourceCode, options.config?.parserOptions)
			: options.parser.parse(sourceCode, options.config?.parserOptions)
		: parser.parse(sourceCode, options?.config?.parserOptions);
	const ruleset = convertRuleset(options?.config);
	const document = new MLDocument<T, O>(ast, ruleset, [options?.specs ?? ({} as any), {}], {
		ariaVersion: ARIA_RECOMMENDED_VERSION,
	});
	return document;
}

export function createTestNodeList(
	sourceCode: string,
	options?: CreateTestOptions,
): readonly MLNode<any, any, MLASTNode>[] {
	const document = createTestDocument(sourceCode, options);
	return document.nodeList;
}

export function createTestTokenList(sourceCode: string, options?: CreateTestOptions): readonly MLToken<MLASTToken>[] {
	const document = createTestDocument(sourceCode, options);
	return document.getTokenList();
}

export function createTestElement(sourceCode: string, options?: CreateTestOptions): MLElement<any, any> {
	const document = createTestDocument(sourceCode, options);
	const el = document.nodeList[0];
	if (el && el.is(el.ELEMENT_NODE)) {
		return el;
	}
	throw new TypeError(`Could not parse it to be an element from: ${sourceCode}`);
}

/**
 * for test suite
 */
export function dummySchemas() {
	return [spec] as [MLMLSpec, ...ExtendedSpec[]];
}
