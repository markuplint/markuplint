import type { NamespaceURI, Namespace } from '@markuplint/ml-ast';

import { getNS } from './get-ns';

const cache = new Map<string, NamespacedElementName>();

type NamespacedElementName = {
	localNameWithNS: string;
	localName: string;
	namespace: Namespace;
	namespaceURI: NamespaceURI;
};

const namespaceURIMap: Record<Namespace, NamespaceURI> = {
	html: 'http://www.w3.org/1999/xhtml',
	svg: 'http://www.w3.org/2000/svg',
	mml: 'http://www.w3.org/1998/Math/MathML',
	xlink: 'http://www.w3.org/1999/xlink',
};

export function resolveNamespace(name: string, namespaceURI: string | null = 'http://www.w3.org/1999/xhtml') {
	const cached = cache.get(name + namespaceURI);
	if (cached) {
		return cached;
	}
	const [_explicitNS, _localName] = name.split(':');
	const explicitNS = _localName ? _explicitNS : null;
	const localName = _localName ?? _explicitNS ?? '';
	const namespace =
		(['html', 'svg', 'mml', 'xlink'] as const).find(_ns => _ns === (explicitNS || getNS(namespaceURI ?? null))) ||
		'html';
	const result: NamespacedElementName = {
		localNameWithNS: `${namespace === 'html' ? '' : `${namespace}:`}${localName}`,
		localName,
		namespace,
		namespaceURI: namespaceURIMap[namespace],
	};
	cache.set(name + namespaceURI, result);
	return result;
}
