import type { MLASTHTMLAttr } from '@markuplint/ml-ast';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import { compileDirectivePatterns, resolveDirective } from '@markuplint/ml-spec';
import { searchIDLAttribute } from '@markuplint/parser-utils';

/**
 * What an attribute of the AST turns out to be once the spec is applied to it.
 */
export type ResolvedAttr = {
	readonly potentialName: string;
	readonly candidate?: string;
	readonly isDynamicValue?: true;
	readonly isDirective?: true;
	readonly isDuplicatable: boolean;
	/** Only a matching directive pattern sets it; otherwise the attribute is a `string`. */
	readonly valueType?: 'string' | 'number' | 'boolean' | 'code';
};

/**
 * Resolves the name an attribute goes by, and what the spec says about it, from the AST token.
 *
 * This is what `MLAttr` does when it is built, kept in one place because the Rust engine has to see
 * the same attributes as the TypeScript rules do: `@markuplint/markuplint` applies it to the AST
 * before handing the AST over.
 *
 * - A name the parser resolved (`potentialName`) takes precedence.
 * - Otherwise the declarative directive patterns of the spec resolve it (Vue's `:href` is `href`,
 *   `@click` is `onclick`) and say whether it is a directive or has a dynamic value.
 * - Then, for a spec that opts in with `acceptedAttrNames`, the IDL attribute name is mapped to the
 *   content attribute name. This is done here and not in each parser, as any such spec shares the
 *   same mapping.
 *
 * @param ast - The attribute token.
 * @param specs - The merged spec the document is checked against.
 */
export function resolveAttrNames(
	ast: MLASTHTMLAttr,
	specs: Pick<MLMLSpec | ExtendedSpec, 'directivePatterns' | 'acceptedAttrNames'>,
): ResolvedAttr {
	if (ast.potentialName != null) {
		return {
			potentialName: ast.potentialName,
			candidate: ast.candidate,
			isDynamicValue: ast.isDynamicValue,
			isDirective: ast.isDirective,
			isDuplicatable: ast.isDuplicatable,
		};
	}

	const rawName = ast.name.raw;
	const patterns = specs.directivePatterns ?? [];
	const resolution = patterns.length > 0 ? resolveDirective(rawName, compileDirectivePatterns(patterns)) : null;

	let potentialName = resolution ? (resolution.potentialName ?? rawName) : rawName;
	let candidate = ast.candidate;
	const isDirective = resolution ? resolution.isDirective : ast.isDirective;

	if (specs.acceptedAttrNames && !isDirective) {
		const { contentAttrName, idlPropName } = searchIDLAttribute(potentialName);
		if (contentAttrName && contentAttrName !== potentialName) {
			potentialName = contentAttrName;
		}
		// Set candidate for IDL naming suggestions (e.g., tabindex → tabIndex in JSX).
		// Only in 'idl' mode (React). In 'both' mode (Svelte), both content and IDL names are accepted.
		if (!resolution && idlPropName && specs.acceptedAttrNames === 'idl' && rawName !== idlPropName) {
			candidate = idlPropName;
		}
	}

	return {
		potentialName,
		candidate,
		isDynamicValue: resolution ? resolution.isDynamicValue : ast.isDynamicValue,
		isDirective,
		isDuplicatable: (resolution ? resolution.isDuplicatable : undefined) ?? ast.isDuplicatable,
		valueType: resolution?.valueType,
	};
}
