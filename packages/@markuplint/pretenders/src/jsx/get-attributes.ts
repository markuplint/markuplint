import type { Attr } from '../types';

import * as ts from 'typescript';

import { finder } from './finder';

export function getAttributes(el: ts.JsxOpeningElement | ts.JsxSelfClosingElement, sourceFile: ts.SourceFile) {
	const find = finder(sourceFile);
	const attrs: Attr[] = [];

	find(el.attributes, ts.isJsxAttribute, attr => {
		find(attr, ts.isStringLiteral, str => {
			attrs.push({
				nodeType: 'static',
				name: attr.name.getText(sourceFile),
				value: str.text,
			});
		});

		find(attr, ts.isJsxExpression, exp => {
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

	find(el.attributes, ts.isJsxSpreadAttribute, attr => {
		attrs.push({
			nodeType: 'spread',
			name: attr.name?.getText(sourceFile) ?? 'N/A',
			value: 'N/A',
		});
	});

	return attrs;
}
