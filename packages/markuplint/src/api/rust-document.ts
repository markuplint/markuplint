import type { PositionedNode } from '../suppressions/compute-scope.js';
import type { AccessibilityProperties } from '@markuplint/ml-core';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { createSelector } from '@markuplint/ml-core';
import { isFatalError } from '@markuplint/shared';

/**
 * What a consumer reads of the document that a lint of the Rust path ran on. The Rust engine builds
 * no `MLDocument`, so these views stand for it, and the engine asks for them only when a
 * consumer does: none costs a lint that nobody reads them in.
 */
export type RustDocumentView = {
	/** The TS `Document#nodeList`, as the scope of a suppression reads it; `null` when the document did not parse. */
	readonly nodes: () => readonly PositionedNode[] | null;
	/** The TS `Document#debugMap()`; `null` when the document did not parse. */
	readonly debugMap: () => readonly string[] | null;
	/**
	 * TS `Document#deepQuerySelectorAll()`: where the elements that the selector matches start, in
	 * every tree of the document; none when the document did not parse. It throws for a selector
	 * that cannot be read.
	 */
	readonly search: (selector: string) => readonly SearchedPosition[];
	/**
	 * TS `Document#searchNodeByLocation()` and `Document#getAccessibilityProp()`: the element at the
	 * position and what the accessibility tree has of it; `null` when there is none, or the
	 * document did not parse.
	 */
	readonly accessibility: (line: number, col: number, ariaVersion: ARIAVersion) => AccessibilityAt | null;
};

/** The element at a position, and its accessibility properties (what the hover of the language server shows). */
export type AccessibilityAt = {
	/** TS `MLElement#localName`. */
	readonly node: string;
	readonly aria: AccessibilityProperties;
};

/** Where an element that a search found starts (TS `MLElement#startLine` / `startCol`). */
export type SearchedPosition = {
	readonly line: number;
	readonly col: number;
};

/**
 * The entry points of the native addon that describe a document the Rust HTML parser read. They
 * take what `lintHtml` takes, and build the same document.
 */
export type RustInspectBinding = {
	/** JSON of {@link InspectedNode}`[]`, or `null` when the document did not parse. */
	nodeListHtml: (html: string, configJson: string, specJson: string) => string | null;
	debugMapHtml: (html: string, configJson: string, specJson: string) => string[] | null;
	searchHtml: (html: string, selector: string, configJson: string, specJson: string) => SearchedPosition[];
	/** JSON of {@link InspectedAccessibility}, or `null` where there is no element. */
	accessibilityHtml: (
		html: string,
		line: number,
		col: number,
		ariaVersion: string,
		configJson: string,
		specJson: string,
	) => string | null;
};

/**
 * What `markuplint_rules::inspect::InspectedAccessibility` serializes: JSON has no ordered record, so the
 * properties are a list, in the order the hover shows them.
 */
type InspectedAccessibility = {
	readonly nodeName: string;
	readonly aria: Omit<Extract<AccessibilityProperties, { unknown: false }>, 'props' | 'unknown'> & {
		readonly unknown: boolean;
		readonly props?: readonly {
			readonly name: string;
			readonly value: string | null;
			readonly required: boolean;
		}[];
	};
};

/**
 * A node as `markuplint_rules::inspect::InspectedNode` serializes it: the references between
 * nodes are indexes into the list.
 */
type InspectedNode = {
	readonly nodeType: number;
	readonly localName: string;
	readonly id: string;
	readonly classList: readonly string[];
	readonly attributes: readonly { readonly name: string; readonly value: string }[];
	readonly parentElement: number | null;
	readonly children: readonly number[];
	readonly startLine: number;
	readonly startCol: number;
};

type MutablePositionedNode = {
	-readonly [K in keyof PositionedNode]: PositionedNode[K];
};

/**
 * The view of a document that the Rust HTML parser read. The Rust engine describes it, from the
 * same code and configuration that it linted.
 */
export function createHtmlDocumentView(
	binding: RustInspectBinding,
	code: string,
	configJson: string,
	specJson: string,
): RustDocumentView {
	let nodes: readonly PositionedNode[] | null | undefined;
	return {
		nodes() {
			if (nodes === undefined) {
				const json = binding.nodeListHtml(code, configJson, specJson);
				nodes = json === null ? null : toPositionedNodes(JSON.parse(json) as readonly InspectedNode[]);
			}
			return nodes;
		},
		debugMap: () => binding.debugMapHtml(code, configJson, specJson),
		search(selector) {
			try {
				return binding.searchHtml(code, selector, configJson, specJson);
			} catch (error) {
				if (isFatalError(error)) {
					throw error;
				}
				// A selector that cannot be read is told in the words of the TS selector parser, as the
				// TS engine does, not in those of the Rust one. When TS reads it, the Rust error stands.
				createSelector(selector, JSON.parse(specJson) as Parameters<typeof createSelector>[1]);
				throw error;
			}
		},
		accessibility(line, col, ariaVersion) {
			const json = binding.accessibilityHtml(code, line, col, ariaVersion, configJson, specJson);
			return json === null ? null : toAccessibilityAt(JSON.parse(json) as InspectedAccessibility);
		},
	};
}

/**
 * Links the nodes that the Rust engine described into the objects the scope of a suppression
 * walks: a node knows its parent element and its child elements.
 */
export function toPositionedNodes(inspected: readonly InspectedNode[]): readonly PositionedNode[] {
	const nodes: MutablePositionedNode[] = inspected.map(node => ({
		nodeType: node.nodeType,
		localName: node.localName,
		id: node.id,
		// An array is iterable, and `contains` is what `DOMTokenList` adds that the scope reads.
		classList: Object.assign([...node.classList], {
			contains: (className: string) => node.classList.includes(className),
		}),
		attributes: node.attributes,
		parentElement: null,
		childElements: [],
		startLine: node.startLine,
		startCol: node.startCol,
	}));

	for (const [index, node] of inspected.entries()) {
		const target = nodes[index];
		if (!target) {
			continue;
		}
		target.parentElement = node.parentElement === null ? null : (nodes[node.parentElement] ?? null);
		target.childElements = node.children.map(child => nodes[child]).filter(child => child !== undefined);
	}

	return nodes;
}

/**
 * The accessibility properties as TS `getAccessibilityProp` has them: `props` is a record by the name
 * without `aria-`, in the order of the list.
 */
function toAccessibilityAt({ nodeName, aria }: InspectedAccessibility): AccessibilityAt {
	const { props, ...rest } = aria;
	return {
		node: nodeName,
		aria: {
			...rest,
			...(props
				? {
						props: Object.fromEntries(
							props.map(prop => [prop.name, { value: prop.value, required: prop.required }]),
						),
					}
				: {}),
		} as AccessibilityProperties,
	};
}
