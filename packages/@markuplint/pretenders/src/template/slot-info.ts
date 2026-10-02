import type { TemplatePropResolver } from './analyze-script.js';
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
 *
 * `resolveProp` is for the attributes of the wrappers and the contents (see {@link toAttrs}).
 */
export function deriveSlotInfo(scan: ComponentScanResult, resolveProp?: TemplatePropResolver): SlotInfo {
	const wrappers = scan.slotWrappers ?? [];
	const rootContents = toContents(scan.rootContents ?? [], resolveProp);

	if (!scan.hasSlots) {
		return { slots: null, contents: rootContents };
	}

	if (wrappers.every(wrapper => wrapper.isRoot)) {
		return { slots: true, contents: rootContents };
	}

	return {
		slots: wrappers.map((wrapper): Slot => {
			const attrs = toAttrs(wrapper.attrs, resolveProp);
			const contents = toContents(wrapper.contents, resolveProp);
			return {
				element: wrapper.element,
				...(attrs.length > 0 ? { attrs } : {}),
				...(isTrivialContents(contents) ? {} : { contents }),
			};
		}),
		contents: [],
	};
}

/**
 * A dynamic attribute whose expression is just a prop of the component is
 * `{ fromAttr, omitIfMissing: true }`: the attribute the usage site writes, and none when it
 * does not (see `createTemplatePropResolver`). Any other dynamic attribute is `{ dynamic: true }`.
 */
export function toAttrs(attrs: readonly ComponentScanAttr[], resolveProp?: TemplatePropResolver): PretenderAttr[] {
	return attrs.map((attr): PretenderAttr => {
		if (attr.dynamic) {
			const prop = resolveProp?.(attr.expression);
			return prop === undefined
				? { name: attr.name, value: { dynamic: true } }
				: { name: attr.name, value: { fromAttr: prop, omitIfMissing: true } };
		}
		return attr.value === undefined ? { name: attr.name } : { name: attr.name, value: attr.value };
	});
}

function toContents(contents: readonly ComponentScanContent[], resolveProp?: TemplatePropResolver): PretenderContent[] {
	return contents.map((content): PretenderContent => {
		if ('element' in content) {
			const attrs = toAttrs(content.attrs ?? [], resolveProp);
			return { element: content.element, ...(attrs.length > 0 ? { attrs } : {}) };
		}
		return content;
	});
}
