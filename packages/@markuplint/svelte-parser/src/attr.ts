import type { SvelteDirective } from './svelte-parser/index.js';
import type { MLASTAttr, MLASTHTMLAttr } from '@markuplint/ml-ast';

import { defaultValueDelimiters, parseAttr, sliceFragment } from '@markuplint/parser-utils';

import { directiveTokenizer } from './directive-tokenizer.js';

const mustacheTag = {
	start: '{',
	end: '}',
};

const specificBindDirective = new Set(['bind:group', 'bind:this']);

export function attr(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: SvelteDirective,
	rawHTML: string,
): MLASTAttr | { __spreadAttr: true } {
	const isShorthand =
		attr.value && Array.isArray(attr.value)
			? attr.value.some((val: any) => val.type === 'AttributeShorthand')
			: false;

	const { start, end } = attr;

	if (attr.type === 'Spread') {
		return {
			__spreadAttr: true,
		};
	}

	let token: MLASTHTMLAttr;

	if (attr.type === 'Attribute' && !isShorthand) {
		const { raw } = sliceFragment(rawHTML, start, end);
		token = parseAttr(raw, start, rawHTML, {
			valueDelimiters: [...defaultValueDelimiters, mustacheTag],
		});
	} else {
		const { raw, startLine, startCol, startOffset } = sliceFragment(rawHTML, start, end);
		token = directiveTokenizer(raw, startLine, startCol, startOffset);
	}

	if (!specificBindDirective.has(token.name.raw) && /^bind:/i.test(token.name.raw)) {
		// Remove "bind:"
		token.potentialName = token.name.raw.slice(5);
		token.isDirective = undefined;
		token.isDynamicValue = true;
	}

	if (isShorthand) {
		token.potentialName = token.value.raw.trim();
		token.isDirective = undefined;
		token.isDynamicValue = true;
	}

	const [baseName, subName] = token.name.raw.split(':');
	if (baseName?.toLowerCase() === 'class') {
		token.isDuplicatable = true;

		if (subName) {
			token.potentialName = 'class';
			token.isDynamicValue = true;
		}
	}

	if (token.startQuote.raw === '{' && token.endQuote.raw === '}') {
		token.isDynamicValue = true;
	}

	return {
		...token,
	};
}
