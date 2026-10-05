import type { Attr } from '../types.js';
import type { PropResolver } from './resolve-prop.js';
import type { PretenderAttr } from '@markuplint/ml-config';
import type { Expression, JsxOpeningElement, JsxSelfClosingElement, SourceFile } from 'typescript';

import ts from 'typescript';

const {
	isAsExpression,
	isJsxAttribute,
	isJsxExpression,
	isJsxSpreadAttribute,
	isNoSubstitutionTemplateLiteral,
	isNumericLiteral,
	isParenthesizedExpression,
	isPrefixUnaryExpression,
	isSatisfiesExpression,
	isStringLiteral,
	SyntaxKind,
} = ts;

/**
 * Classifies each attribute by node type: static (string literal, or an expression
 * that is just a literal), boolean (no value), prop (an expression that is just a
 * prop of the component, when `resolveProp` is given), dynamic (any other expression),
 * or spread (`{...props}`).
 *
 * The value is classified by the initializer itself and never by the literals
 * found inside it: `type={a ? 'x' : 'y'}` is one dynamic attribute, not two
 * static ones.
 */
export function getAttributes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: JsxOpeningElement | JsxSelfClosingElement,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: SourceFile,
	resolveProp?: PropResolver,
) {
	const attrs: Attr[] = [];

	for (const attr of el.attributes.properties) {
		if (isJsxSpreadAttribute(attr)) {
			attrs.push({
				nodeType: 'spread',
				name: 'N/A',
				value: 'N/A',
			});
			continue;
		}

		if (!isJsxAttribute(attr)) {
			continue;
		}

		const name = attr.name.getText(sourceFile);
		const { initializer } = attr;

		if (!initializer) {
			attrs.push({ nodeType: 'boolean', name, value: '' });
			continue;
		}

		if (isStringLiteral(initializer)) {
			attrs.push({ nodeType: 'static', name, value: initializer.text });
			continue;
		}

		const literal = isJsxExpression(initializer) ? getLiteralText(initializer.expression) : undefined;
		const prop = isJsxExpression(initializer) ? resolveProp?.(initializer.expression) : undefined;
		if (prop !== undefined) {
			attrs.push({ nodeType: 'prop', name, value: prop });
		} else if (literal === undefined) {
			attrs.push({
				nodeType: 'dynamic',
				name,
				value: isJsxExpression(initializer) ? (initializer.expression?.getText(sourceFile) ?? '') : '',
			});
		} else {
			attrs.push({ nodeType: 'static', name, value: literal });
		}
	}

	return attrs;
}

/**
 * Converts the classified attributes to the pretender format:
 * a static value keeps its value, a boolean has no `value`,
 * a prop of the component is `{ fromAttr, omitIfMissing: true }` (the usage site writes
 * it, and an omitted prop renders no attribute), and a dynamic one is `{ dynamic: true }`.
 * Spread attributes are dropped (they are expressed by `inheritAttrs`).
 */
export function toPretenderAttrs(attrs: readonly Attr[]): PretenderAttr[] {
	return attrs
		.filter(attr => attr.nodeType !== 'spread')
		.map((attr): PretenderAttr => {
			if (attr.nodeType === 'dynamic') {
				return { name: attr.name, value: { dynamic: true } };
			}
			if (attr.nodeType === 'prop') {
				return { name: attr.name, value: { fromAttr: attr.value, omitIfMissing: true } };
			}
			return attr.nodeType === 'static' && attr.value
				? { name: attr.name, value: attr.value }
				: { name: attr.name };
		});
}

/**
 * The text of an expression that is only a literal, which React renders
 * the same as the equivalent string attribute:
 * `{'x'}`, `{`x`}`, `{0}`, `{-1}` (parentheses and `as` / `satisfies` are looked through).
 */
function getLiteralText(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: Expression | undefined,
): string | undefined {
	if (!expression) {
		return undefined;
	}
	if (isParenthesizedExpression(expression) || isAsExpression(expression) || isSatisfiesExpression(expression)) {
		return getLiteralText(expression.expression);
	}
	if (isStringLiteral(expression) || isNoSubstitutionTemplateLiteral(expression) || isNumericLiteral(expression)) {
		return expression.text;
	}
	if (
		isPrefixUnaryExpression(expression) &&
		expression.operator === SyntaxKind.MinusToken &&
		isNumericLiteral(expression.operand)
	) {
		return `-${expression.operand.text}`;
	}
	return undefined;
}
