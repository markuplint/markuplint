import type { MLASTDocument } from '@markuplint/ml-ast';

/**
 * Detects whether a parsed component template contains slot usage.
 *
 * Supports:
 * - Vue: `<slot>` element (`nodeName === 'slot'`)
 * - Svelte 4: `<slot>` element (parsed as psblock `#ps:SlotElement`)
 * - Svelte 5: `{@render children()}` (parsed as psblock `#ps:RenderTag`)
 * - Astro: `<slot />` element (`nodeName === 'slot'`)
 *
 * @param doc - The parsed MLAST document to search
 * @returns `true` if the template contains any slot or children render usage
 */
export function detectSlots(doc: MLASTDocument): boolean {
	for (const node of doc.nodeList) {
		if (node.type === 'starttag' && node.nodeName === 'slot') {
			return true;
		}

		if (node.type === 'psblock' && (node.nodeName === '#ps:SlotElement' || node.nodeName === '#ps:RenderTag')) {
			return true;
		}
	}
	return false;
}
