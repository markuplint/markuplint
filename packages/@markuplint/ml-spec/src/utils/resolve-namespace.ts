import type { NamespaceURI } from '@markuplint/ml-ast';

import { getNS } from './get-ns';

const cache = new Map<string, NamespacedElementName>();

type NamespacedElementName = {
	localNameWithNS: string;
	localName: string;
	namespace: 'html' | 'svg' | 'mml';
	namespaceURI: NamespaceURI;
};

export function resolveNamespace(localName: string, namespaceURI: string = 'http://www.w3.org/1999/xhtml') {
	const cached = cache.get(localName + namespaceURI);
	if (cached) {
		return cached;
	}
	const name = localName.split(':')[1] || localName;
	const ns = getNS(namespaceURI || null);
	const result: NamespacedElementName = {
		localNameWithNS: `${ns === 'html' ? '' : `${ns}:`}${name}`,
		localName: name,
		namespace: ns,
		namespaceURI:
			(
				[
					'http://www.w3.org/1999/xhtml',
					'http://www.w3.org/2000/svg',
					'http://www.w3.org/1998/Math/MathML',
				] as const
			).find(ns => ns === namespaceURI) || 'http://www.w3.org/1999/xhtml',
	};
	cache.set(localName + namespaceURI, result);
	return result;
}
