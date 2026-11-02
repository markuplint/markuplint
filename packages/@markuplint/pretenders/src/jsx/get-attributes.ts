import type { Attr } from '../types.js';
import type { PropResolver } from './resolve-prop.js';
import type { PretenderAttr } from '@markuplint/ml-config';
import type { JsxOpeningElement, JsxSelfClosingElement, SourceFile } from 'typescript';

import ts from 'typescript';

const { isJsxAttribute, isJsxExpression, isJsxSpreadAttribute, isStringLiteral } = ts;

/**
 * Classifies each attribute by node type: static (string literal), boolean (no value), prop
 * (an expression that is just a prop of the component, when `resolveProp` is given),
 * expression (any other expression, which is reported as the code it is written as), or
 * spread (`{...props}`).
 *
 * The value is classified by the initializer itself and never by the literals
 * found inside it: `type={a ? 'x' : 'y'}` is one expression, not two static ones.
 * Whether an expression is a literal (`{true}`, `{'x'}`, `{0}`) and what it renders
 * as is not decided here: `@markuplint/ml-core` reads the code as the document it
 * is used in does.
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

		const prop = isJsxExpression(initializer) ? resolveProp?.(initializer.expression) : undefined;
		const expression = isJsxExpression(initializer) ? initializer.expression?.getText(sourceFile) : undefined;
		if (prop !== undefined) {
			attrs.push({ nodeType: 'prop', name, value: prop });
		} else if (expression) {
			attrs.push({ nodeType: 'expression', name, value: expression });
		} else {
			attrs.push({ nodeType: 'dynamic', name, value: '' });
		}
	}

	return attrs;
}

/**
 * Converts the classified attributes to the pretender format:
 * a static value keeps its value, a boolean has no `value`,
 * a prop of the component is `{ fromAttr, omitIfMissing: true }` (the usage site writes
 * it, and an omitted prop renders no attribute), an expression is `{ expression }` (the code
 * as it is written), and one whose code is not known is `{ dynamic: true }`.
 * Spread attributes are dropped (they are expressed by `inheritAttrs`).
 */
export function toPretenderAttrs(attrs: readonly Attr[]): PretenderAttr[] {
	return attrs
		.filter(attr => attr.nodeType !== 'spread')
		.map((attr): PretenderAttr => {
			if (attr.nodeType === 'dynamic') {
				return { name: attr.name, value: { dynamic: true } };
			}
			if (attr.nodeType === 'expression') {
				return { name: attr.name, value: { expression: attr.value } };
			}
			if (attr.nodeType === 'prop') {
				return { name: attr.name, value: { fromAttr: attr.value, omitIfMissing: true } };
			}
			return attr.nodeType === 'static' && attr.value
				? { name: attr.name, value: attr.value }
				: { name: attr.name };
		});
}
