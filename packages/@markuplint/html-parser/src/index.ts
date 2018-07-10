import _isDocumentFragment from './is-document-fragment';
import _parse from './parse';

namespace HTMLParser {
	export const parse = _parse;
	export const isDocumentFragment = _isDocumentFragment;
}

export default HTMLParser;
