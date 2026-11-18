/**
 * The elements of documents as the stream of `questions.ts` needs them: the name that the data gives, the attributes, and the parent.
 *
 * @module
 */
import type { DocumentElement } from './questions.ts';

import { parser } from '@markuplint/html-parser';

const PREFIX: Readonly<Record<string, string>> = {
	'http://www.w3.org/2000/svg': 'svg:',
	'http://www.w3.org/1998/Math/MathML': 'mml:',
};

/**
 * The elements of a document, in the order of their start tags.
 *
 * @param html - The document
 * @returns The elements
 */
export function elementsOf(html: string): DocumentElement[] {
	const elements: DocumentElement[] = [];
	const names = new Map<string, string>();
	for (const node of parser.parse(html).nodeList) {
		if (node.type !== 'starttag') {
			continue;
		}
		const name = `${PREFIX[node.namespace] ?? ''}${node.nodeName}`.toLowerCase();
		names.set(node.uuid, name);
		elements.push({
			name,
			attributes: node.attributes.flatMap(attribute =>
				// a spread attribute of a framework has no name; the parser of HTML makes none
				'name' in attribute ? [[attribute.name.raw.toLowerCase(), attribute.value.raw] as const] : [],
			),
			parent: (node.parentNodeUuid !== null && names.get(node.parentNodeUuid)) || null,
		});
	}
	return elements;
}
