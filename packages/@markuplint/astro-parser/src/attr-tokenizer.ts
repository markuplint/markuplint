import type { AttributeNode } from './astro-parser';
import type { MLASTHTMLAttr } from '@markuplint/ml-ast';

import { defaultValueDelimiters, getSpaceBefore, parseAttr, sliceFragment } from '@markuplint/parser-utils';

const mustacheTag = {
	start: '{',
	end: '}',
};

export function attrTokenizer(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: AttributeNode,
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nextAttr: AttributeNode | null,
	rawHtml: string,
	startTag: string,
	startTagEndOffset: number,
): MLASTHTMLAttr {
	if (!attr.position) {
		throw new TypeError("Attr doesn't have position");
	}

	if (attr.position.end) {
		throw new TypeError('Node may is an attribute because it has end position');
	}

	let nextAttrBeforeSpaceOffset: number;
	if (nextAttr) {
		if (!nextAttr.position) {
			throw new TypeError("NextAttr doesn't have position");
		}

		if (nextAttr.position.end) {
			throw new TypeError('NextAttr Node may is an attribute because it has end position');
		}

		nextAttrBeforeSpaceOffset = getSpaceBefore(nextAttr.position.start.offset, rawHtml).startOffset;
	} else {
		const close = /(\/?>)$/.exec(startTag)?.[1] ?? '';
		nextAttrBeforeSpaceOffset = startTagEndOffset - close.length;
	}

	const { raw, startOffset } = sliceFragment(rawHtml, attr.position.start.offset, nextAttrBeforeSpaceOffset);

	const result = parseAttr(raw, startOffset, rawHtml, {
		valueDelimiters: [...defaultValueDelimiters, mustacheTag],
	});

	if (result.startQuote.raw === mustacheTag.start) {
		result.isDynamicValue = true;
	}

	/**
	 * Detects Template Directive
	 *
	 * @see https://docs.astro.build/en/reference/directives-reference/
	 */
	const [, directive] = result.name.raw.match(/^([^:]+):([^:]+)$/) ?? [];
	if (directive) {
		const lowerCaseDirectiveName = directive.toLowerCase();
		switch (lowerCaseDirectiveName) {
			case 'class': {
				result.potentialName = lowerCaseDirectiveName;
				break;
			}
			default: {
				result.isDirective = true;
			}
		}
	}

	return result;
}
