import type { MLASTBlockBehavior } from '@markuplint/ml-ast';

/**
 * Detects the block behavior of an Astro expression by inspecting its raw
 * source for `.map()` or `.filter()` array method calls. Maps `.map()` to
 * `'each'` (iteration) and `.filter()` to `'if'` (conditional filtering).
 *
 * @param raw - The raw source text of the expression to analyze
 * @returns The detected block behavior, or `null` if no recognized pattern is found
 */
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
