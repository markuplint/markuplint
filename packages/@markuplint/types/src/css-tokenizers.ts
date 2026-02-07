import { isBCP47 } from './rfc/is-bcp-47.js';
import type { CssSyntaxTokenizer } from './types.js';

/**
 * Custom CSS syntax tokenizers for css-tree integration.
 *
 * Provides tokenizer functions for CSS value types that require
 * custom parsing logic beyond what css-tree supports natively.
 */
export const cssTokenizers: Record<string, CssSyntaxTokenizer> = {
	// RFC
	// https://tools.ietf.org/rfc/bcp/bcp47.html
	'bcp-47'(token) {
		if (!token) {
			return 0;
		}
		return isBCP47()(token.value) ? 1 : 0;
	},
};
