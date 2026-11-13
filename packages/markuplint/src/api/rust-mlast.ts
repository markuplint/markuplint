import type { Document } from '@markuplint/ml-core';
import type { AttrNameRoute, MLASTDocument, MLASTHTMLAttr } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import { literalToExpression, resolveAttrNames } from '@markuplint/ml-core';

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
		readonly slotElement?: 'html' | 'framework';
	};
	/**
	 * What the framework renders each attribute as, by the `uuid` of its token ({@link renderAttrs}).
	 * Without it an attribute whose value is code is taken as one whose value is not known.
	 */
	readonly renderings?: ReadonlyMap<string, AttrRendering>;
};

/**
 * What `MLAttr` makes of the value of an attribute once the framework is taken into account
 * (`literal-values.ts` of `@markuplint/ml-core`): a literal written as code is rendered to a value
 * (`aria-busy={true}` is `"true"`), or not output at all (`disabled={false}`).
 */
export type AttrRendering = {
	/** `MLAttr#value`: the rendered value, or the value as written. */
	readonly value: string;
	/** `MLAttr#isDynamicValue`: the value is not known. */
	readonly isDynamicValue: boolean;
	/** `MLAttr#isExpressionValue`: the value is written as code. */
	readonly isExpressionValue: boolean;
	/** `MLAttr#isAbsent`: the framework does not output the attribute. */
	readonly isAbsent: boolean;
	/**
	 * The code of the value when it is nothing but a literal (`literalToExpression` of `MLAttr#literal`).
	 * What a component's attribute renders as is the string of the literal, which `"false"` and `false`
	 * share, so a pretender that forwards the attribute (`{ fromAttr }`) needs the code.
	 */
	readonly literalExpression?: string;
};

/**
 * Reads what each attribute of a TS `Document` renders as, by the `uuid` of its token, for
 * {@link mlastForRust}. The `Document` is built from the same AST and options as `MLCore`
 * builds it, so the Rust rules read the values the TS rules read.
 *
 * @param document - The document built from the AST that is sent to Rust.
 */
export function renderAttrs<T extends RuleConfigValue, O extends PlainData>(
	document: Document<T, O>,
): Map<string, AttrRendering> {
	const renderings = new Map<string, AttrRendering>();
	for (const node of document.nodeList) {
		if (node.is(node.ELEMENT_NODE)) {
			for (const attr of node.attributes) {
				renderings.set(attr.uuid, {
					value: attr.value,
					isDynamicValue: attr.isDynamicValue === true,
					isExpressionValue: attr.isExpressionValue === true,
					isAbsent: attr.isAbsent === true,
					...(attr.literal && {
						literalExpression: literalToExpression(attr.literal),
					}),
				});
			}
		}
	}
	return renderings;
}

/**
 * Serializes the AST of a framework parser for the napi `lint()`, which builds the Rust DOM from
 * it (migration-period scaffolding: the framework parsers stay in TypeScript until they are
 * ported, and this goes with them).
 *
 * What the TS engine does after parsing is done here, so that the Rust rules, which read
 * `potentialName`, `potentialValue`, `isDynamicValue`, `isDirective` and `candidate` off the
 * attribute, see what the TS rules see:
 *
 * - The name an attribute goes by, and whether it is a directive, are resolved from the spec.
 *   This is `resolveAttrNames`, the function `MLAttr` is built with, so the two cannot disagree.
 * - The value is what the framework renders (`renderings`): `potentialValue` is the rendered value
 *   when it is not the one written, and the fields of the attribute mean what they mean on
 *   `MLAttr`: `isDynamicValue` that the value is not known, `isExpressionValue` that it is written
 *   as code (what the parser calls `isDynamicValue`), `isAbsent` that it is not output.
 * - `endTag`, `booleanish`, `tagNameCaseSensitive`, `attrNameCaseSensitive`, `attrNameRoute` and
 *   `componentNameVariants` and `slotElement` of the parser are sent next to the nodes (`DocumentSettings` on the
 *   Rust side), as `MLCore` hands them to `Document`.
 *
 * @param ast - What the parser returned; it is not modified.
 * @returns The JSON `lint()` takes as its first argument.
 */
export function mlastForRust(ast: MLASTDocument, { spec, parser, renderings }: MLASTForRustOptions): string {
	// Every node is in `nodeList` and again in its parent's `childNodes`, as the same object, so
	// an attribute is resolved once.
	const resolvedAttrs = new WeakMap<MLASTHTMLAttr, MLASTHTMLAttr>();

	const resolveAttr = (attr: MLASTHTMLAttr): MLASTHTMLAttr => {
		const cached = resolvedAttrs.get(attr);
		if (cached) {
			return cached;
		}
		// The fields of the AST only: `expressionLanguage` is for reading a literal, which `renderings` did
		const {
			potentialName,
			candidate,
			isDynamicValue,
			isDirective,
			isDuplicatable,
			valueType,
			matchedDirectivePattern,
			duplicateKey,
			duplicateKeyFolds,
		} = resolveAttrNames(attr, spec);
		const rendering = renderings?.get(attr.uuid);
		const written = attr.potentialValue ?? attr.value.raw;
		const result = {
			...attr,
			potentialName,
			candidate,
			isDynamicValue: rendering ? rendering.isDynamicValue || undefined : isDynamicValue,
			isExpressionValue: rendering ? rendering.isExpressionValue || undefined : isDynamicValue,
			isAbsent: rendering?.isAbsent || undefined,
			literalExpression: rendering?.literalExpression,
			...(rendering &&
				rendering.value !== written &&
				!rendering.isDynamicValue && { potentialValue: rendering.value }),
			isDirective,
			isDuplicatable,
			...(valueType && { valueType }),
			// What the matching pattern says of a repeat, which `MLAttr#duplicateKey` is built from
			...(matchedDirectivePattern && {
				directiveKey: {
					...(typeof duplicateKey === 'string' && { key: duplicateKey }),
					...(duplicateKey === null && { never: true }),
					...(duplicateKeyFolds && { folds: true }),
				},
			}),
		};
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
			slotElement: parser.slotElement,
		},
		(_key, value: unknown) => (isHTMLAttr(value) ? resolveAttr(value) : value),
	);
}

function isHTMLAttr(value: unknown): value is MLASTHTMLAttr {
	return typeof value === 'object' && value !== null && 'type' in value && value.type === 'attr';
}
