import type { MLElement } from '../ml-dom/node/element.js';
import type { MLNode } from '../ml-dom/node/node.js';
import type { MLASTNode, MLParser } from '@markuplint/ml-ast';
import type { Config, PlainData, Pretender, RuleConfigValue } from '@markuplint/ml-config';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { ARIA_RECOMMENDED_VERSION } from '@markuplint/ml-spec';
import { parser } from '@markuplint/html-parser';
import spec from '@markuplint/html-spec';

import { convertRuleset } from '../convert-ruleset.js';
import { MLDocument } from '../ml-dom/node/document.js';

/**
 * Options for creating test documents and elements.
 */
export type CreateTestOptions = {
	/** The markuplint configuration to apply */
	readonly config?: Config;
	/** A parser module or parser instance to use instead of the default HTML parser */
	readonly parser?: { readonly parser: Readonly<MLParser> } | Readonly<MLParser>;
	/** The HTML/ARIA specification data to use */
	readonly specs?: MLMLSpec;
	/** Pretender definitions for component mapping */
	readonly pretenders?: readonly Pretender[];
};

/**
 * Parses markup source code and returns a test document for use in rule tests.
 *
 * @template T - The rule config value type
 * @template O - The rule options type
 * @param sourceCode - The markup source code to parse
 * @param options - Options for parser, config, specs, and pretenders
 * @returns A parsed MLDocument instance
 */
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
	const document = new MLDocument<T, O>(
		ast,
		ruleset,
		[options?.specs ?? (spec as unknown as MLMLSpec), {}],
		{ ariaVersion: ARIA_RECOMMENDED_VERSION },
		options?.pretenders ? { pretenders: options.pretenders } : undefined,
	);
	return document;
}

/**
 * Parses markup source code and returns the flat list of AST nodes.
 *
 * @param sourceCode - The markup source code to parse
 * @param options - Options for parser, config, specs, and pretenders
 * @returns A readonly array of all nodes in the parsed document
 */
export function createTestNodeList(
	sourceCode: string,
	options?: CreateTestOptions,
): readonly MLNode<any, any, MLASTNode>[] {
	const document = createTestDocument(sourceCode, options);
	return document.nodeList;
}

/**
 * Parses markup source code and returns the first element node.
 * Throws if the source does not produce an element as its first node.
 *
 * @param sourceCode - The markup source code containing an element
 * @param options - Options for parser, config, specs, and pretenders
 * @returns The first element in the parsed document
 * @throws {TypeError} If the first node is not an element
 */
export function createTestElement(sourceCode: string, options?: CreateTestOptions): MLElement<any, any> {
	const document = createTestDocument(sourceCode, options);
	const el = document.nodeList[0];
	if (el && el.is(el.ELEMENT_NODE)) {
		return el;
	}
	throw new TypeError(`Could not parse it to be an element from: ${sourceCode}`);
}

/**
 * Returns the default HTML spec as a schema tuple for use in test suites.
 *
 * @returns A single-element tuple containing the HTML specification
 */
export function dummySchemas() {
	return [spec] as [MLMLSpec];
}
