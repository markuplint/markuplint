import { MLASTAttr } from '@markuplint/ml-ast/src';

export function attr(attr: MLASTAttr): MLASTAttr {
	if (attr.type !== 'html-attr') {
		return attr;
	}

	/**
	 * If data-binding attributes
	 */
	const [, directive, potentialName] = attr.name.raw.match(/(^v-bind:|^:|^v-on|@)(.+)/i) || [];
	if (directive && potentialName) {
		return {
			...attr,
			potentialName,
		};
	}

	/**
	 * If directives
	 */
	if (/^v-/.test(attr.name.raw)) {
		return {
			...attr,
			isDirective: true,
		};
	}

	return attr;
}
