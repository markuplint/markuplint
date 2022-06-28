import type { Namespace } from '@markuplint/ml-ast';

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
