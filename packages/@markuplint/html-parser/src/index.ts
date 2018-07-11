import _isDocumentFragment from './is-document-fragment';
import _nodeListToDebugMaps from './node-list-to-debug-maps';
import _parse from './parse';

namespace HTMLParser {
	export const parse = _parse;
	export const isDocumentFragment = _isDocumentFragment;
	export const nodeListToDebugMaps = _nodeListToDebugMaps;
}

export default HTMLParser;
