import type { ARIAVersion } from '@markuplint/ml-spec';
import type { MLEngine } from 'markuplint';

import { searchNodeAtLocation } from '@markuplint/ml-core';

/**
 * The element at a position and what the accessibility tree has of it. `aria` is `null` where the
 * markuplint that is older than 6 has none to give.
 */
type AccessibilityByLocation = {
	readonly node: string;
	readonly aria: NonNullable<ReturnType<MLEngine['accessibilityAt']>>['aria'] | null;
};

/**
 * Finds the element at a position and what the accessibility tree has of it, for the hover.
 *
 * A markuplint that has the Rust engine answers by position whichever engine lints
 * (`MLEngine#accessibilityAt`): the Rust engine builds no `Document`, so there is none to read.
 * The older ones answer from the `Document` of the engine, which the server reads as before.
 *
 * @param engine - The engine of the document
 * @param line - The 1-based line
 * @param col - The column as `Document#searchNodeByLocation` reads it
 * @param ariaVersion - The ARIA specification version
 * @returns The element's name and its accessibility properties, or `null` where there is no element
 */
export async function getAccessibilityByLocation(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	engine: MLEngine,
	line: number,
	col: number,
	ariaVersion: ARIAVersion,
): Promise<AccessibilityByLocation | null> {
	if (hasAccessibilityAt(engine)) {
		if (!engine.linted) {
			await engine.exec();
		}
		return engine.accessibilityAt(line, col, ariaVersion);
	}

	if (!engine?.document) {
		await engine.exec();
	}

	if (!engine?.document) {
		return null;
	}

	// The engine is the markuplint the user installed, whose `searchNodeByLocation` may be of an older
	// version (one that compared the line and the column apart and took the end of a range in), so the
	// node list is searched here, by the rule of this version.
	const node = searchNodeAtLocation(engine.document.nodeList, line, col);

	if (!node || !node.is(node.ELEMENT_NODE)) {
		return null;
	}

	const aria = engine.document.getAccessibilityProp(node, ariaVersion);

	return {
		node: node.localName,
		aria,
	};
}

/**
 * Whether the engine is one of a markuplint that has the Rust engine and answers by position. The
 * module is the project's own, so it may be an older one (the type is the bundled one, which has
 * the method).
 *
 * @param engine - An engine of the markuplint the document is linted with
 * @returns `true` when it has `accessibilityAt`
 */
export function hasAccessibilityAt(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	engine: { readonly accessibilityAt?: unknown },
): boolean {
	return typeof engine.accessibilityAt === 'function';
}
