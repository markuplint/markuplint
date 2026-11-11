import type { MLASTAttr } from '@markuplint/ml-ast';

const pretendedAttrs = new WeakSet<MLASTAttr>();

/**
 * Marks an AST attribute as made by a pretender. The AST contract of `@markuplint/ml-ast` is that of
 * what a parser reads, so a fact of the core is kept here and not in a field of the node.
 *
 * @param attr - The AST attribute that `MLElement` makes from an attribute of a pretender
 * @returns The same attribute
 */
export function markPretendedAttr<T extends MLASTAttr>(attr: T): T {
	pretendedAttrs.add(attr);
	return attr;
}

/**
 * Whether an AST attribute was made by a pretender ({@link markPretendedAttr}).
 *
 * @param attr - An AST attribute
 * @returns `true` if the attribute was made by a pretender
 */
export function isPretendedAttr(attr: MLASTAttr): boolean {
	return pretendedAttrs.has(attr);
}
