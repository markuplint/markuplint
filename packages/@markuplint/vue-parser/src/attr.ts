import type { MLASTAttr } from '@markuplint/ml-ast';

const duplicatableAttrs = ['class', 'style'];

export function attr(attr: MLASTAttr): MLASTAttr {
	if (attr.type !== 'html-attr') {
		const name = attr.potentialName;
		if (duplicatableAttrs.includes(name)) {
			attr.isDuplicatable = true;
		}
		return attr;
	}

	/**
	 * If data-binding attributes
	 */
	const [, directive, potentialName] = attr.name.raw.match(/^(v-bind:|:)(.+)$/i) || [];
	if (directive && potentialName) {
		if (duplicatableAttrs.includes(potentialName.toLowerCase())) {
			attr.isDuplicatable = true;
		}

		return {
			...attr,
			potentialName,
			isDynamicValue: true,
		};
	}

	/**
	 * If directives
	 */
	if (/^(?:v-|@)/.test(attr.name.raw)) {
		return {
			...attr,
			isDirective: true,
		};
	}

	return attr;
}
