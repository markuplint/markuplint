import type { OriginalNode } from './types.js';
import type { NamespaceURI } from '@markuplint/ml-ast';

type PretenderNamespace = NonNullable<OriginalNode['namespace']>;

const URIS: Readonly<Record<PretenderNamespace, NamespaceURI>> = {
	html: 'http://www.w3.org/1999/xhtml',
	svg: 'http://www.w3.org/2000/svg',
	math: 'http://www.w3.org/1998/Math/MathML',
};

/**
 * The namespace URI of the name a pretender definition states the namespace of an
 * element with (`OriginalNode.namespace`).
 */
export function pretenderNamespaceToURI(namespace: PretenderNamespace): NamespaceURI {
	return URIS[namespace];
}

/**
 * The name a pretender definition states a namespace URI with, or `undefined` for one that
 * is not the namespace of an element (XLink).
 */
export function uriToPretenderNamespace(uri: NamespaceURI): PretenderNamespace | undefined {
	return (Object.keys(URIS) as PretenderNamespace[]).find(name => URIS[name] === uri);
}
