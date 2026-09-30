import type { ComponentScanAttr, ComponentScanContent, ComponentScanResult } from '../component-scanner.js';
import type { SlotInfo } from '../contents.js';
import type { PretenderAttr, PretenderContent, Slot } from '@markuplint/ml-config';

import { isTrivialContents } from '../contents.js';

/**
 * Derives the slot information from a scan result.
 *
 * - Every slot is directly in the root (or there is no wrapper information):
 *   the root wraps the slot, and the direct children of the root are the contents.
 * - Some slot is in an inner element: those inner elements (and the root, if it wraps
 *   a slot too) are the slot wrappers, and the contents of the root are irrelevant.
 */
export function deriveSlotInfo(scan: ComponentScanResult): SlotInfo {
	const wrappers = scan.slotWrappers ?? [];
	const rootContents = toContents(scan.rootContents ?? []);

	if (!scan.hasSlots) {
		return { slots: null, contents: rootContents };
	}

	if (wrappers.every(wrapper => wrapper.isRoot)) {
		return { slots: true, contents: rootContents };
	}

	return {
		slots: wrappers.map((wrapper): Slot => {
			const attrs = toAttrs(wrapper.attrs);
			const contents = toContents(wrapper.contents);
			return {
				element: wrapper.element,
				...(attrs.length > 0 ? { attrs } : {}),
				...(isTrivialContents(contents) ? {} : { contents }),
			};
		}),
		contents: [],
	};
}

function toAttrs(attrs: readonly ComponentScanAttr[]): PretenderAttr[] {
	return attrs.map(attr => (attr.value === undefined ? { name: attr.name } : { name: attr.name, value: attr.value }));
}

function toContents(contents: readonly ComponentScanContent[]): PretenderContent[] {
	return contents.map((content): PretenderContent => {
		if ('element' in content) {
			const attrs = toAttrs(content.attrs ?? []);
			return { element: content.element, ...(attrs.length > 0 ? { attrs } : {}) };
		}
		return content;
	});
}
