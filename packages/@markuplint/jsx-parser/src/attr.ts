import type { JSXAttribute } from './jsx';
import type { MLASTAttr } from '@markuplint/ml-ast';

import { attrTokenizer } from '@markuplint/html-parser';
import { searchIDLAttribute, sliceFragment, tokenizer, uuid } from '@markuplint/parser-utils';

import { getAttrName } from './jsx';

export function attr(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: JSXAttribute,
	rawHTML: string,
): MLASTAttr {
	const beforeHtml = rawHTML.substr(0, attr.range[0]);
	const spacesBeforeNameStr = (beforeHtml.match(/\s+$/) || [''])[0];
	const startOffset = attr.range[0] - spacesBeforeNameStr.length;
	const endOffset = attr.range[1];
	const attrLoc = sliceFragment(rawHTML, startOffset, endOffset);

	let ast: MLASTAttr;
	if (attr.value === null || attr.value.type === 'Literal') {
		ast = attrTokenizer(attrLoc.raw, attrLoc.startLine, attrLoc.startCol, attrLoc.startOffset);
	} else {
		const spacesBeforeNameLine = attr.loc.start.line - (spacesBeforeNameStr.match(/\n/g) ?? []).length;
		const spacesBeforeNameLastBreakIndex = spacesBeforeNameStr.lastIndexOf('\n');
		const spacesBeforeNameColumn =
			spacesBeforeNameLastBreakIndex === -1
				? attr.loc.start.column
				: attr.loc.start.column - spacesBeforeNameStr.slice(spacesBeforeNameLastBreakIndex + 1).length;
		const spacesBeforeNameOffset = attr.range[0] - spacesBeforeNameStr.length;
		const spacesBeforeName = tokenizer(
			spacesBeforeNameStr,
			spacesBeforeNameLine,
			spacesBeforeNameColumn,
			spacesBeforeNameOffset,
		);
		const name = tokenizer(
			getAttrName(attr.name),
			spacesBeforeName.endLine,
			spacesBeforeName.endCol,
			spacesBeforeName.endOffset,
		);
		const spacesBeforeEqual = tokenizer('', name.endLine, name.endCol, name.endOffset);
		const equal = tokenizer('=', spacesBeforeEqual.endLine, spacesBeforeEqual.endCol, spacesBeforeEqual.endOffset);
		const spacesAfterEqual = tokenizer('', equal.endLine, equal.endCol, equal.endOffset);
		const startQuote = tokenizer('', spacesAfterEqual.endLine, spacesAfterEqual.endCol, spacesAfterEqual.endOffset);
		const rawValue = sliceFragment(rawHTML, attr.value.range[0], attr.value.range[1]);
		const value = tokenizer(rawValue.raw, rawValue.startLine, rawValue.startCol, rawValue.startOffset);
		const endQuote = tokenizer(null, value.endLine, value.endCol, value.endOffset);
		ast = {
			uuid: uuid(),
			...attrLoc,
			type: 'html-attr',
			spacesBeforeName,
			name,
			spacesBeforeEqual,
			equal,
			spacesAfterEqual,
			startQuote,
			value,
			endQuote,
			isDynamicValue: true,
			isDuplicatable: false,
			nodeName: name.raw,
			parentNode: null,
			nextNode: null,
			prevNode: null,
			isFragment: false,
			isGhost: false,
		};
	}

	const rawName = ast.name.raw;
	const { idlPropName, contentAttrName } = searchIDLAttribute(rawName);

	ast.potentialName = contentAttrName;

	if (rawName !== idlPropName) {
		ast.candidate = idlPropName;
	}

	return ast;
}
