import html, { Attribute } from '@markuplint/html-spec';

export function attrSpecs(tag: string) {
	tag = tag.toLowerCase();
	const spec = html.specs.find(spec => spec.name === tag);
	if (!spec) {
		return [];
	}
	const hasGlobalAttr = spec.attributes.some(attr => attr === '#globalAttrs');

	const attrs: Attribute[] = [];

	if (hasGlobalAttr) {
		attrs.push(...html.def['#globalAttrs']);
	}

	for (const attr of spec.attributes) {
		if (typeof attr === 'string') {
			continue;
		}

		const definedIndex = attrs.findIndex(a => a.name === attr.name);
		if (definedIndex !== -1) {
			attrs[definedIndex] = {
				...attrs[definedIndex],
				...attr,
			};
			continue;
		}

		attrs.push(attr);
	}

	return attrs;
}

export function match(needle: string, pattern: string) {
	const matches = pattern.match(/^\/(.*)\/(i|g|m)*$/);
	if (matches && matches[1]) {
		const re = matches[1];
		const flag = matches[2];
		return new RegExp(re, flag).test(needle);
	}
	return needle === pattern;
}

/**
 * PotentialCustomElementName
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname
 *
 * > PotentialCustomElementName ::=
 * >   [a-z] (PCENChar)* '-' (PCENChar)*
 * > PCENChar ::=
 * >   "-" | "." | [0-9] | "_" | [a-z] | #xB7 | [#xC0-#xD6] | [#xD8-#xF6] | [#xF8-#x37D] |
 * >   [#x37F-#x1FFF] | [#x200C-#x200D] | [#x203F-#x2040] | [#x2070-#x218F] | [#x2C00-#x2FEF] | [#x3001-#xD7FF] | [#xF900-#xFDCF] | [#xFDF0-#xFFFD] | [#x10000-#xEFFFF]
 * > This uses the EBNF notation from the XML specification. [XML]
 *
 * ASCII-case-insensitively.
 * Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 */
export const rePCENChar = [
	'\\-',
	'\\.',
	'[0-9]',
	'_',
	'[a-z]',
	'\u00B7',
	'[\u00C0-\u00D6]',
	'[\u00D8-\u00F6]',
	'[\u00F8-\u037D]',
	'[\u037F-\u1FFF]',
	'[\u200C-\u200D]',
	'[\u203F-\u2040]',
	'[\u2070-\u218F]',
	'[\u2C00-\u2FEF]',
	'[\u3001-\uD7FF]',
	'[\uF900-\uFDCF]',
	'[\uFDF0-\uFFFD]',
	'[\uD800-\uDBFF][\uDC00-\uDFFF]',
].join('|');

const reCostomElement = new RegExp(`^(?:[a-z](?:${rePCENChar})*\\-(?:${rePCENChar})*)$`, 'i');

export function isCustomElement(nodeName: string) {
	return reCostomElement.test(nodeName);
}
