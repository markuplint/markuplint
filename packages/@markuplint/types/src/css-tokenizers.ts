import { isBCP47 } from './rfc/is-bcp-47.js';
import type { CssSyntaxTokenizer } from './types.js';

export const cssTokenizers: Record<string, CssSyntaxTokenizer> = {
	// RFC
	// https://www.rfc-editor.org/info/bcp47
	'bcp-47'(token) {
		if (!token) {
			return 0;
		}
		return isBCP47()(token.value) ? 1 : 0;
	},
};
