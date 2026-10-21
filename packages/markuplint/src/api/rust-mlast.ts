import type { AttrNameRoute, MLASTDocument, MLASTHTMLAttr } from '@markuplint/ml-ast';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import { resolveAttrNames } from '@markuplint/ml-core';

/**
 * What the Rust engine needs besides the nodes to read a document the way the TS `Document`
 * reads it.
 */
type MLASTForRustOptions = {
	/** The spec the document is checked against, extended specs merged (`schemaToSpec`). */
	readonly spec: Pick<MLMLSpec | ExtendedSpec, 'directivePatterns' | 'acceptedAttrNames'>;
	/** The parser that produced the AST: what the TS `Document` takes from it besides the nodes. */
	readonly parser: {
		readonly endTag?: 'xml' | 'omittable' | 'never';
		readonly booleanish?: boolean;
		readonly tagNameCaseSensitive?: boolean;
		readonly attrNameCaseSensitive?: boolean;
		readonly attrNameRoute?: AttrNameRoute;
		readonly componentNameVariants?: boolean;
	};
};

/**
 * Serializes the AST of a framework parser for the napi `lint()`, which builds the Rust DOM from
 * it (migration-period scaffolding: the framework parsers stay in TypeScript until they are
 * ported, and this goes with them).
 *
 * Two things the TS engine does after parsing are done here, so that the Rust rules, which read
 * `potentialName`, `isDynamicValue`, `isDirective` and `candidate` off the attribute as the
 * parser left them, see what the TS rules see:
 *
 * - The name an attribute goes by, and whether it is a directive or has a dynamic value, are
 *   resolved from the spec. This is `resolveAttrNames`, the function `MLAttr` is built with, so
 *   the two cannot disagree.
 * - `endTag`, `booleanish`, `tagNameCaseSensitive`, `attrNameCaseSensitive`, `attrNameRoute` and
 *   `componentNameVariants` of the parser are sent next to the nodes (`DocumentSettings` on the
 *   Rust side), as `MLCore` hands them to `Document`.
 *
 * @param ast - What the parser returned; it is not modified.
 * @returns The JSON `lint()` takes as its first argument.
 */
export function mlastForRust(ast: MLASTDocument, { spec, parser }: MLASTForRustOptions): string {
	// Every node is in `nodeList` and again in its parent's `childNodes`, as the same object, so
	// an attribute is resolved once.
	const resolvedAttrs = new WeakMap<MLASTHTMLAttr, MLASTHTMLAttr>();

	const resolveAttr = (attr: MLASTHTMLAttr): MLASTHTMLAttr => {
		const cached = resolvedAttrs.get(attr);
		if (cached) {
			return cached;
		}
		const { valueType, ...resolved } = resolveAttrNames(attr, spec);
		const result = { ...attr, ...resolved, ...(valueType && { valueType }) };
		resolvedAttrs.set(attr, result);
		return result;
	};

	return JSON.stringify(
		{
			...ast,
			endTag: parser.endTag,
			booleanish: parser.booleanish,
			tagNameCaseSensitive: parser.tagNameCaseSensitive,
			attrNameCaseSensitive: parser.attrNameCaseSensitive,
			attrNameRoute: parser.attrNameRoute,
			componentNameVariants: parser.componentNameVariants,
		},
		(_key, value: unknown) => (isHTMLAttr(value) ? resolveAttr(value) : value),
	);
}

function isHTMLAttr(value: unknown): value is MLASTHTMLAttr {
	return typeof value === 'object' && value !== null && 'type' in value && value.type === 'attr';
}
