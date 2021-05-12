import { parse, parseFragment } from 'parse5';
import { NamespaceURI } from '@markuplint/ml-ast';

const DEFAULT_NAMESPACE = 'http://www.w3.org/1999/xhtml';

export function getNamespace(tagName: string, parentNamespace: string = DEFAULT_NAMESPACE): NamespaceURI {
	switch (parentNamespace) {
		case 'http://www.w3.org/2000/svg':
		case 'http://www.w3.org/1998/Math/MathML': {
			const parent = parentNamespace === 'http://www.w3.org/2000/svg' ? 'svg' : 'math';
			const tag = `<${parent}><${tagName}></${parent}>`;
			const frag = parseFragment(tag);
			const node = frag.childNodes[0];
			if (!node) {
				return DEFAULT_NAMESPACE;
			}
			if ('namespaceURI' in node) {
				return node.namespaceURI as NamespaceURI;
			}
			return DEFAULT_NAMESPACE;
		}
	}
	const tag = `<${tagName}>`;
	const frag = parseFragment(tag);
	let node = frag.childNodes[0];
	if (!node) {
		const doc = parse(tag);
		node = doc.childNodes[0];
	}
	if ('namespaceURI' in node) {
		return node.namespaceURI as NamespaceURI;
	}
	return DEFAULT_NAMESPACE;
}
