import type { Namespace } from '@markuplint/ml-ast';

/**
 * Maps a full namespace URI string to its shorthand `Namespace` identifier.
 * Returns `'html'` as the default for any unrecognized or null namespace.
 *
 * @param namespaceURI - The full namespace URI, or null
 * @returns The shorthand namespace identifier (`'html'`, `'svg'`, `'mml'`, or `'xlink'`)
 */
export function getNS(namespaceURI: string | null): Namespace {
	switch (namespaceURI) {
		case 'http://www.w3.org/2000/svg': {
			return 'svg';
		}
		case 'http://www.w3.org/1998/Math/MathML': {
			return 'mml';
		}
		case 'http://www.w3.org/1999/xlink': {
			return 'xlink';
		}
		default: {
			return 'html';
		}
	}
}
