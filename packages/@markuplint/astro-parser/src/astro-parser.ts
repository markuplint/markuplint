import type { RootNode } from '@astrojs/compiler/types';

import { ParserError } from '@markuplint/parser-utils';
import { parseTemplate } from 'astro-eslint-parser';

export type {
	RootNode,
	ElementNode,
	CustomElementNode,
	ComponentNode,
	FragmentNode,
	AttributeNode,
	Node,
} from '@astrojs/compiler/types';

/**
 * Parses an Astro component source string into the Astro compiler's root AST node.
 * Delegates to astro-eslint-parser and converts any diagnostics into ParserErrors.
 *
 * @param code - The raw Astro component source code
 * @returns The root AST node produced by the Astro compiler
 */
export function astroParse(code: string): RootNode {
	const { result } = parseTemplate(code);

	if (result.diagnostics[0]) {
		const error = result.diagnostics[0];
		throw new ParserError(error.text, {
			line: error.location.line,
			col: error.location.column,
		});
	}

	return result.ast;
}
