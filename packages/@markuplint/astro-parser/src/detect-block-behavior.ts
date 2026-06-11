import type { MLASTBlockBehavior } from '@markuplint/ml-ast';

export function detectBlockBehavior(raw: string): MLASTBlockBehavior | null {
	const re = /\.+\s*(?<type>map|filter)\s*\((?:function\s*\(.[^\n\r{\u2028\u2029]*\{.*return\s*$|.+=>\s*\(?\s*)/;
	const match = raw.match(re);
	if (!match) {
		return null;
	}
	const type = match.groups?.type === 'map' ? 'each' : 'if';
	return {
		type,
		expression: raw,
	};
}
