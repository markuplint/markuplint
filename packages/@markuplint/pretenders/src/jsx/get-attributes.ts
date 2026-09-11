import type { Attr } from '../types.js';
import type { JsxOpeningElement, JsxSelfClosingElement, SourceFile } from 'typescript';

import ts from 'typescript';

import { finder } from './finder.js';

const { isJsxAttribute, isJsxExpression, isJsxSpreadAttribute, isStringLiteral } = ts;

/**
 * Classifies each attribute by node type: static (string literal value),
 * boolean (no value), dynamic (expression value), or spread (`{...props}`).
 */
export function getAttributes(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: JsxOpeningElement | JsxSelfClosingElement,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: SourceFile,
) {
	const find = finder(sourceFile);
	const attrs: Attr[] = [];

	find(el.attributes, isJsxAttribute, attr => {
		find(attr, isStringLiteral, str => {
			attrs.push({
				nodeType: 'static',
				name: attr.name.getText(sourceFile),
				value: str.text,
			});
		});

		find(attr, isJsxExpression, exp => {
			attrs.push({
				nodeType: 'dynamic',
				name: attr.name.getText(sourceFile),
				value: exp.getText(sourceFile),
			});
		});

		if (attr.getChildCount(sourceFile) === 1) {
			attrs.push({
				nodeType: 'boolean',
				name: attr.name.getText(sourceFile),
				value: '',
			});
		}
	});

	find(el.attributes, isJsxSpreadAttribute, attr => {
		attrs.push({
			nodeType: 'spread',
			name: attr.name?.getText(sourceFile) ?? 'N/A',
			value: 'N/A',
		});
	});

	return attrs;
}
