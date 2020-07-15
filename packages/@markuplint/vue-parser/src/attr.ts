import { MLASTAttr } from '@markuplint/ml-ast/src';

export function attr(attr: MLASTAttr): MLASTAttr {
	if (attr.type !== 'html-attr') {
		return attr;
	}

	/**
	 * If data-binding attributes
	 */
	const [, directive, attrName, modifiedEventDirective, modifiedEventName, , eventDirective, eventName] =
		attr.name.raw.match(
			/(^v-bind:|^:)(.+)|(^v-on:|^@)(.+)(\.(?:stop|prevent|capture|self|once|passive)$)|(^v-on:|^@)(.+)/i,
		) || [];
	const isDirective = !!(directive || modifiedEventDirective || eventDirective);
	const potentialName = attrName || modifiedEventName || eventName;
	if (isDirective && potentialName) {
		return {
			...attr,
			potentialName,
			isDynamicValue: true,
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
