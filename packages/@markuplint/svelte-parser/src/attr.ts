import type { SvelteDirective } from './svelte-parser';
import type { MLASTAttr } from '@markuplint/ml-ast';

import { attrTokenizer } from '@markuplint/html-parser';
import { sliceFragment } from '@markuplint/parser-utils';

import directiveTokenizer from './directive-tokenizer';

const specificBindDirective = ['bind:group', 'bind:this'];

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

	if (attr.type === 'Attribute' && !isShorthand) {
		const { raw, startLine, startCol, startOffset } = sliceFragment(rawHTML, start, end);
		const token = attrTokenizer(raw, startLine, startCol, startOffset);
		return token;
	}
	const { raw, startLine, startCol, startOffset } = sliceFragment(rawHTML, start, end);
	const valueToken = isShorthand
		? attr.name
		: attr.expression && 'start' in attr.expression && 'end' in attr.expression
		? sliceFragment(rawHTML, attr.expression.start, attr.expression.end).raw
		: '';

	const token = directiveTokenizer(raw, valueToken, startLine, startCol, startOffset);

	if (!specificBindDirective.includes(token.name.raw) && /^bind:/i.test(token.name.raw)) {
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

	return {
		...token,
	};
}
