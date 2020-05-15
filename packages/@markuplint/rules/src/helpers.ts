import html, { Attribute } from '@markuplint/html-ls';

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
