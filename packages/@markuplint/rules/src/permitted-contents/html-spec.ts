import html from '@markuplint/html-spec';

export default function htmlSpec(tag: string) {
	tag = tag.toLowerCase();
	const spec = html.specs.find(spec => spec.name === tag);
	const contentSpec = spec == null ? null : spec.permittedStructures;
	return contentSpec;
}
